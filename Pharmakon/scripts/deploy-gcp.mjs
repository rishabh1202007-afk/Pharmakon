import { spawnSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.slice(2).split('=');
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = 'true';
    }
  }

  return parsed;
}

const cliArgs = parseArgs(process.argv.slice(2));

const region = cliArgs.region || process.env.npm_config_region || process.env.GCP_REGION;
const mongodbUri = cliArgs.mongodb_uri || process.env.npm_config_mongodb_uri || process.env.MONGODB_URI;
const serviceName = cliArgs.service || process.env.npm_config_service || process.env.GCP_SERVICE || 'pharmaco';
const explicitProject = cliArgs.project || process.env.npm_config_project || process.env.GCP_PROJECT;
const gcloudBin = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud';

function runGcloud(args, options = {}) {
  const { capture = false } = options;

  const result = spawnSync(gcloudBin, args, {
    stdio: capture ? 'pipe' : 'inherit',
    shell: true,
    encoding: 'utf8',
  });

  return result;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function getActiveProject() {
  if (explicitProject) {
    return explicitProject;
  }

  const result = runGcloud(['config', 'get-value', 'project'], { capture: true });
  if (result.status !== 0) {
    return '';
  }

  return String(result.stdout || '').trim();
}

if (!region) {
  console.error('Missing region. Use: npm run deploy:gcp -- --region=us-central1 --mongodb_uri="<uri>"');
  process.exit(1);
}

if (!mongodbUri) {
  console.error('Missing MongoDB URI. Use: npm run deploy:gcp -- --region=us-central1 --mongodb_uri="<uri>"');
  process.exit(1);
}

const versionCheck = runGcloud(['--version'], { capture: true });
if (versionCheck.status !== 0) {
  fail('Google Cloud CLI is not available. Install gcloud CLI and ensure it is on PATH.');
}

const projectId = getActiveProject();
if (!projectId || projectId === '(unset)') {
  fail(
    'No active GCP project. Run: gcloud auth login ; gcloud config set project YOUR_PROJECT_ID\n' +
      'Or pass --project=YOUR_PROJECT_ID to npm run deploy:gcp.',
  );
}

const enableApisResult = runGcloud([
  'services',
  'enable',
  'run.googleapis.com',
  'cloudbuild.googleapis.com',
  'artifactregistry.googleapis.com',
  '--project',
  projectId,
]);

if (enableApisResult.status !== 0) {
  fail('Failed enabling required APIs for Cloud Run deployment.');
}

const envFilePath = path.join(os.tmpdir(), `pharmaco-env-${Date.now()}.yaml`);
writeFileSync(envFilePath, `MONGODB_URI: ${JSON.stringify(mongodbUri)}\n`, 'utf8');

const args = [
  'run',
  'deploy',
  serviceName,
  '--source',
  '.',
  '--region',
  region,
  '--allow-unauthenticated',
  '--project',
  projectId,
  '--env-vars-file',
  envFilePath,
];

console.log(`Deploying '${serviceName}' to '${region}' in project '${projectId}'...`);

const result = runGcloud(args);

try {
  unlinkSync(envFilePath);
} catch {
  // no-op
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
