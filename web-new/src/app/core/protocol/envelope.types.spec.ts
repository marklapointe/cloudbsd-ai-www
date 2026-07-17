import {
  ENVELOPE_MIME,
  Envelope,
  firstPayload,
  headerValue,
  uuidV4,
} from './envelope.types';
import { handleMockEnvelope } from './mock-handlers';

describe('envelope types & mocks', () => {
  it('uuidV4 returns hyphenated id', () => {
    const id = uuidV4();
    expect(id.split('-').length).toBe(5);
  });

  it('headerValue and firstPayload read envelope', () => {
    const env: Envelope = {
      mime: ENVELOPE_MIME,
      requestId: 'r1',
      timestamp: new Date().toISOString(),
      context: {},
      headers: [
        { name: 'who', value: 'admin' },
        { name: 'what', value: 'vms.list' },
      ],
      payload: [{ mime: 'x', kind: 'vm', data: { id: '1' } }],
    };
    expect(headerValue(env, 'what')).toBe('vms.list');
    expect(firstPayload(env, 'vm')?.data).toEqual({ id: '1' });
  });

  it('mock vms.list returns batch with includes', () => {
    const req: Envelope = {
      mime: ENVELOPE_MIME,
      requestId: 'req-1',
      timestamp: new Date().toISOString(),
      context: {},
      headers: [{ name: 'what', value: 'vms.list' }],
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: { filter: { search: 'next' }, sort: { field: 'name', direction: 'asc' } },
        },
      ],
    };
    const res = handleMockEnvelope(req);
    const batch = firstPayload(res, 'vms.batch');
    expect(batch).toBeTruthy();
    expect((batch!.includes || []).length).toBeGreaterThan(0);
    expect((batch!.includes![0].data as { name: string }).name).toContain('next');
  });

  it('mock preflight blocks jellyfin migrate', () => {
    const req: Envelope = {
      mime: ENVELOPE_MIME,
      requestId: 'req-2',
      timestamp: new Date().toISOString(),
      context: {},
      headers: [{ name: 'what', value: 'vm.migrate.preflight' }],
      payload: [
        {
          mime: 'application/vnd.cloudbsd+preflight.request',
          kind: 'preflight.request',
          data: {
            resource: { type: 'vm', id: 'vm-jellyfin' },
            action: 'migrate',
          },
        },
      ],
    };
    const res = handleMockEnvelope(req);
    const pf = firstPayload<{ viable: boolean; blockers: unknown[] }>(res, 'preflight.result');
    expect(pf?.data.viable).toBe(false);
    expect(pf?.data.blockers.length).toBeGreaterThan(0);
  });

  it('mock auth.login returns session', () => {
    const req: Envelope = {
      mime: ENVELOPE_MIME,
      requestId: 'req-3',
      timestamp: new Date().toISOString(),
      context: {},
      headers: [{ name: 'what', value: 'auth.login' }],
      payload: [
        {
          mime: 'application/vnd.cloudbsd+credentials',
          kind: 'credentials',
          data: { username: 'admin', password: 'x' },
        },
      ],
    };
    const res = handleMockEnvelope(req);
    const session = firstPayload<{ sessionId: string }>(res, 'session');
    expect(session?.data.sessionId).toBeTruthy();
  });
});
