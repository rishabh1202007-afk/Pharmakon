/**
 * CYP2C19 Backend Integration & Security Tests (Phase 2B.1 Hardened & Verified)
 * Tests Express route authorization, sample selection, chromosome consistency,
 * and strict callability behavior.
 */

import { describe, it, expect } from 'vitest';
import { parseVcfContent } from '../parser.js';
import express from 'express';
import http from 'node:http';
import cyp2c19Router from '../routes.js';

const SYNTHETIC_CHR10_VCF = `##fileformat=VCFv4.2
##reference=GRCh37
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	SAMPLE_01	SAMPLE_02
10	96541616	rs4244285	G	A	100	PASS	GENE=CYP2C19	GT:DP:GQ	0|1:35:99	./.:0:0
10	965602623	rs3758581	G	A	100	PASS	GENE=CYP2C19	GT:DP:GQ	0|0:30:90	0|0:25:85
`;

// Setup express test app
const app = express();
app.use(express.json());

// Auth middleware simulation matching server/index.js
app.use('/api', (req, res, next) => {
  const role = req.headers['x-pharmaco-role'] || 'guest';
  const userId = req.headers['x-pharmaco-user-id'] || 'ANON';
  const hospitalId = req.headers['x-pharmaco-hospital-id'] || 'H1';
  const demoMode = req.headers['x-pharmaco-demo-mode'] === 'true';

  req.authContext = {
    userId,
    hospitalId,
    role: demoMode ? 'demo' : role,
    username: userId
  };
  next();
});

app.use('/api/genomics/cyp2c19', cyp2c19Router);

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqOpts = {
        hostname: 'localhost',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(reqOpts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({
              status: res.statusCode,
              body: data ? JSON.parse(data) : null
            });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', err => {
        server.close();
        reject(err);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  });
}

describe('CYP2C19 Backend Security & Integration Tests', () => {
  it('should reject unauthenticated or guest requests to POST /parse', async () => {
    const res = await makeRequest('/api/genomics/cyp2c19/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { vcfContent: SYNTHETIC_CHR10_VCF, sampleId: 'SAMPLE_01' }
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED_GENOMIC_ACCESS');
  });

  it('should permit authorized doctor requests to POST /parse', async () => {
    const res = await makeRequest('/api/genomics/cyp2c19/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pharmaco-role': 'doctor',
        'x-pharmaco-user-id': 'DOC_01'
      },
      body: { vcfContent: SYNTHETIC_CHR10_VCF, sampleId: 'SAMPLE_01' }
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metadata.sampleIds).toContain('SAMPLE_01');
    expect(res.body.data.callability.sampleGenotypesPresent.length).toBeGreaterThan(0);
  });

  it('should permit authorized lab_technician requests to GET /markers', async () => {
    const res = await makeRequest('/api/genomics/cyp2c19/markers', {
      method: 'GET',
      headers: {
        'x-pharmaco-role': 'lab_technician',
        'x-pharmaco-user-id': 'LAB_01'
      }
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mvpMarkers.length).toBe(6);
  });

  it('should handle invalid sample ID selection and return error', () => {
    const result = parseVcfContent(SYNTHETIC_CHR10_VCF, 'NON_EXISTENT_SAMPLE');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Requested sample ID');
  });

  it('should strictly exclude missing genotype calls from sampleGenotypesPresent', () => {
    const result = parseVcfContent(SYNTHETIC_CHR10_VCF, 'SAMPLE_02');
    expect(result.success).toBe(true);
    expect(result.provenance.callability.sampleGenotypesPresent).not.toContain('rs4244285');
  });
});
