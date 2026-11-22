import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { verifyAuthMiddleware, roleAllowed, canEditFieldByRole, StaffAccount, seedStaffAccountsIfNeeded } from '../../server/auth.js';

describe('HTTP Authentication Security & Integration Tests (Comprehensive Real Middleware)', () => {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: true,
      saveUninitialized: true,
      name: 'pharmaco.sid',
    })
  );

  const HOSPITALS_LIST = [
    { hospital_id: 'H1', name: 'Apollo Delhi' },
    { hospital_id: 'H2', name: 'Fortis Mumbai' },
  ];

  app.get('/api/auth/hospitals', (_req: any, res: any) => {
    res.json(HOSPITALS_LIST);
  });

  app.post('/api/auth/login', async (req: any, res: any) => {
    const { hospitalId, username, password, demoMode } = req.body || {};
    const isProduction = process.env.NODE_ENV === 'production';

    if (demoMode === true || demoMode === 'true') {
      if (isProduction) {
        return res.status(401).json({ ok: false, message: 'Demo authentication is prohibited in production.' });
      }
      req.session.user = {
        userId: 'DEMO_' + hospitalId,
        hospital_id: hospitalId || 'H1',
        role: 'doctor',
        username: 'product-tour',
        display_name: 'Demo Tour',
        isDemo: true,
      };
      return req.session.save(() => res.json({ ok: true, user: req.session.user }));
    }

    const account = await StaffAccount.findOne({ hospitalId, username: username?.toLowerCase() });
    if (!account) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials for the selected hospital.' });
    }
    const match = await bcrypt.compare(password, account.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials for the selected hospital.' });
    }
    req.session.user = {
      userId: account.userId,
      hospital_id: account.hospitalId,
      role: account.role,
      username: account.username,
      display_name: account.displayName,
      email: account.email,
      isDemo: false,
    };
    req.session.save((err: any) => {
      if (err) return res.status(500).json({ ok: false });
      res.json({ ok: true, user: req.session.user });
    });
  });

  app.post('/api/auth/logout', (req: any, res: any) => {
    req.session.destroy(() => {
      res.clearCookie('pharmaco.sid');
      res.json({ ok: true });
    });
  });

  app.get('/api/auth/session', (req: any, res: any) => {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.json({ authenticated: false, session: null });
    }
    res.json({
      authenticated: true,
      session: {
        mode: sessionUser.isDemo ? 'demo' : 'authenticated',
        user: sessionUser,
      },
    });
  });

  // Real verification middleware mounted AFTER public auth endpoints matching server/index.js
  app.use('/api', verifyAuthMiddleware);

  app.get('/api/protected/patient', (req: any, res: any) => {
    res.json({ ok: true, authContext: req.authContext });
  });

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/pharmaco_test');
    }
    await StaffAccount.deleteMany({});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    await seedStaffAccountsIfNeeded();
    process.env.NODE_ENV = originalEnv;
  });

  afterAll(async () => {
    await StaffAccount.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Unauthenticated access to a protected patient API returns 401', async () => {
    const res = await request(app).get('/api/protected/patient');
    expect(res.status).toBe(401);
  });

  it('2. Public routes like GET /api/auth/hospitals and POST /api/auth/login are not blocked by auth middleware', async () => {
    const hospRes = await request(app).get('/api/auth/hospitals');
    expect(hospRes.status).toBe(200);
    expect(Array.isArray(hospRes.body)).toBe(true);

    const loginRes = await request(app).post('/api/auth/login').send({
      hospitalId: 'H1',
      username: 'doc1',
      password: 'wrong_password',
    });
    // Reaches login handler and returns 401 invalid credentials (not 401 from verifyAuthMiddleware block)
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.ok).toBe(false);
  });

  it('3. Normal staff login creates a usable session and GET /api/auth/session recognizes it', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({
      hospitalId: 'H1',
      username: 'doc1',
      password: 'pass',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.ok).toBe(true);

    const sessionRes = await agent.get('/api/auth/session');
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.authenticated).toBe(true);
    expect(sessionRes.body.session.user.username).toBe('doc1');

    const protectedRes = await agent.get('/api/protected/patient');
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.authContext.role).toBe('doctor');
  });

  it('4 & 5. Spoofed headers cannot grant admin or change hospital access', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      hospitalId: 'H1',
      username: 'doc1',
      password: 'pass',
    });

    const res = await agent
      .get('/api/protected/patient')
      .set('x-pharmaco-role', 'admin')
      .set('x-pharmaco-hospital-id', 'H2');
    expect(res.status).toBe(200);
    expect(res.body.authContext.role).toBe('doctor');
    expect(res.body.authContext.hospitalId).toBe('H1');
  });

  it('7 & 8 & 9. Demo authentication, synthetic isolation, and restriction checks', async () => {
    const agent = request.agent(app);
    const demoLogin = await agent.post('/api/auth/login').send({
      hospitalId: 'H1',
      demoMode: true,
    });
    expect(demoLogin.status).toBe(200);

    const res = await agent.get('/api/protected/patient');
    expect(res.status).toBe(200);
    expect(res.body.authContext.role).toBe('demo');
    expect(roleAllowed(res.body.authContext.role, ['doctor', 'admin'])).toBe(false);
    expect(canEditFieldByRole(res.body.authContext.role, 'vitals_temperature')).toBe(false);
  });

  it('10. Valid logout invalidates the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      hospitalId: 'H1',
      username: 'doc1',
      password: 'pass',
    });

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const postLogoutRes = await agent.get('/api/protected/patient');
    expect(postLogoutRes.status).toBe(401);
  });

  it('11 & 12. Production demo rejection and production account seeding prevention', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const agent = request.agent(app);
    const prodDemoLogin = await agent.post('/api/auth/login').send({
      hospitalId: 'H1',
      demoMode: true,
    });
    expect(prodDemoLogin.status).toBe(401);

    // Verify seedStaffAccountsIfNeeded skips in production
    await StaffAccount.deleteMany({});
    await seedStaffAccountsIfNeeded();
    const count = await StaffAccount.countDocuments({});
    expect(count).toBe(0);

    process.env.NODE_ENV = originalEnv;
  });
});
