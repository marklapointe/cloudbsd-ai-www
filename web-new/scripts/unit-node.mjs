/**
 * Headless unit checks without Chrome/Karma.
 * Run: npm run test:unit
 */
import { writeFileSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const shared = path.join(root, '../shared/wire').replace(/\\/g, '/');
const script = path.join(tmpdir(), `cloudbsd-unit-${process.pid}.mts`);

const code = `
import { handleMockEnvelope } from '${shared}/mock-handlers.ts';
import { ENVELOPE_MIME, firstPayload } from '${shared}/envelope.types.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const login = handleMockEnvelope({
  mime: ENVELOPE_MIME,
  requestId: '1',
  timestamp: new Date().toISOString(),
  context: {},
  headers: [{ name: 'what', value: 'auth.login' }],
  payload: [{ mime: 'x', kind: 'credentials', data: { username: 'admin', password: 'x' } }],
});
assert(firstPayload(login, 'session')?.data?.sessionId, 'login session');

const vms = handleMockEnvelope({
  mime: ENVELOPE_MIME,
  requestId: '2',
  timestamp: new Date().toISOString(),
  context: {},
  headers: [{ name: 'what', value: 'vms.list' }],
  payload: [{ mime: 'x', kind: 'query', data: { filter: { search: '' } } }],
});
assert((firstPayload(vms, 'vms.batch')?.includes?.length || 0) > 0, 'vms list');

const pf = handleMockEnvelope({
  mime: ENVELOPE_MIME,
  requestId: '3',
  timestamp: new Date().toISOString(),
  context: {},
  headers: [{ name: 'what', value: 'vm.migrate.preflight' }],
  payload: [{
    mime: 'x',
    kind: 'preflight.request',
    data: { resource: { type: 'vm', id: 'vm-jellyfin' }, action: 'migrate' },
  }],
});
assert(firstPayload(pf, 'preflight.result')?.data?.viable === false, 'jellyfin migrate blocked');

const tok = handleMockEnvelope({
  mime: ENVELOPE_MIME,
  requestId: '4',
  timestamp: new Date().toISOString(),
  context: {},
  headers: [{ name: 'what', value: 'vm.console.token' }],
  payload: [{ mime: 'x', kind: 'query', data: { id: 'vm-nextcloud' } }],
});
assert(firstPayload(tok, 'console.token')?.data?.path?.includes('/api/console'), 'console token path');

console.log('unit-node: all assertions passed');
`;

writeFileSync(script, code);
const r = spawnSync('npx', ['--yes', 'tsx', script], {
  cwd: root,
  encoding: 'utf8',
});
try {
  unlinkSync(script);
} catch {
  /* ignore */
}
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
