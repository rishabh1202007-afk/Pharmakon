import express from 'express';
import session from 'express-session';
import ConnectMongo from 'connect-mongo';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_SEED_PATH = path.resolve(__dirname, '../src/data/auth/users.json');

const StaffAccountSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    hospitalId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ['admin', 'doctor', 'nurse', 'lab_technician'] },
    username: { type: String, required: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
  },
  { timestamps: true }
);

StaffAccountSchema.index({ hospitalId: 1, username: 1 }, { unique: true });
export const StaffAccount = mongoose.models.StaffAccount || mongoose.model('StaffAccount', StaffAccountSchema);

export async function seedStaffAccountsIfNeeded() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return;
  }

  try {
    const count = await StaffAccount.countDocuments({});
    if (count > 0) {
      return;
    }

    const raw = await fs.readFile(USERS_SEED_PATH, 'utf8');
    const seedUsers = JSON.parse(raw);
    if (!Array.isArray(seedUsers)) {
      return;
    }

    for (const seed of seedUsers) {
      if (!seed.user_id || !seed.hospital_id || !seed.role || !seed.username || !seed.password) {
        continue;
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(seed.password, salt);

      await StaffAccount.findOneAndUpdate(
        { userId: seed.user_id },
        {
          userId: seed.user_id,
          hospitalId: seed.hospital_id,
          role: seed.role,
          username: seed.username.toLowerCase(),
          passwordHash,
          displayName: seed.display_name || seed.username,
          email: `${seed.username}@${seed.hospital_id.toLowerCase()}.pharmaco.local`,
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('Seeded MongoDB Staff Accounts successfully.');
  } catch (err) {
    console.warn('Failed to seed staff accounts into MongoDB:', err);
  }
}

export function configureSession(app) {
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;

  if (isProduction && (!sessionSecret || sessionSecret === 'default-dev-secret-change-in-production')) {
    console.error('FATAL SECURITY ERROR: SESSION_SECRET must be configured securely in production.');
    process.exit(1);
  }

  const secret = sessionSecret || 'pharmaco-secure-development-session-secret-9981';

  let store;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    store = ConnectMongo.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmaco',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
    });
  } else {
    if (isProduction) {
      console.error('FATAL SECURITY ERROR: MongoDB connection required for persistent session store in production.');
      process.exit(1);
    }
    store = ConnectMongo.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmaco',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
    });
  }

  app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: false,
      store,
      name: 'pharmaco.sid',
      cookie: {
        httpOnly: true,
        secure: false, // Set false for local HTTP demo evaluation to prevent cookie dropping
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
}

export function verifyAuthMiddleware(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  const path = req.path || '';
  const baseUrl = req.baseUrl || '';
  const fullPath = `${baseUrl}${path}`;
  const method = req.method || 'GET';

  const publicRoutes = [
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/logout' },
    { method: 'GET', path: '/api/auth/session' },
    { method: 'GET', path: '/api/auth/hospitals' },
    { method: 'GET', path: '/api/genomics/cyp2c19/ollama-status' },
  ];

  const isPublic = publicRoutes.some((r) => r.method === method && (r.path === path || r.path === fullPath));
  if (isPublic) {
    req.authContext = {
      hospitalId: 'H1',
      userId: 'PUBLIC',
      role: 'doctor',
      username: 'public',
      isDemo: false,
    };
    return next();
  }

  const sessionUser = req.session?.user;
  if (sessionUser && sessionUser.userId && sessionUser.hospital_id && sessionUser.role) {
    if (isProduction && sessionUser.isDemo) {
      req.session.destroy(() => {});
      res.status(401).json({ message: 'Demo authentication is prohibited in production.' });
      return;
    }

    req.authContext = {
      hospitalId: sessionUser.hospital_id,
      userId: sessionUser.userId,
      role: sessionUser.isDemo ? 'demo' : sessionUser.role,
      username: sessionUser.username,
      isDemo: Boolean(sessionUser.isDemo),
      email: sessionUser.email,
      display_name: sessionUser.display_name,
    };
    return next();
  }

  res.status(401).json({
    message: 'Authentication required. Please sign in with valid staff credentials.',
  });
}

export function roleAllowed(role, allowedRoles) {
  if (role === 'admin') {
    return true;
  }
  if (role === 'demo') {
    return false;
  }
  return allowedRoles.includes(role);
}

export function canEditFieldByRole(role, fieldKey) {
  if (role === 'admin') {
    return true;
  }
  if (role === 'demo') {
    return false;
  }

  const key = String(fieldKey || '').trim().toLowerCase();
  let category = 'nonMedication';

  if (key.startsWith('vitals_') || key === 'manual_alertlog' || key === 'manual_handofflog') {
    category = 'vitals';
  } else if (key.startsWith('labs_') || key.startsWith('lab_')) {
    category = 'labs';
  } else if (key.startsWith('medication_') || key.startsWith('prescription_') || key === 'currentmedications') {
    category = 'medications';
  }

  if (role === 'doctor') {
    return category !== 'vitals' && category !== 'labs';
  }
  if (role === 'nurse') {
    return category === 'vitals' || category === 'nonMedication';
  }
  if (role === 'lab_technician') {
    return category === 'labs';
  }

  return false;
}
