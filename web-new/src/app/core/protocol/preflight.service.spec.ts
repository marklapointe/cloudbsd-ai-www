import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { PreflightService } from './preflight.service';
import { EnvelopeClient } from './envelope.client';
import { AuthSessionStore } from '../auth/auth-session.store';

describe('PreflightService', () => {
  let service: PreflightService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), EnvelopeClient, AuthSessionStore, PreflightService],
    });
    // Force mocks path via environment (default true in environment.ts)
    service = TestBed.inject(PreflightService);
  });

  it('returns viable result for generic stop', async () => {
    const r = await service.check('vm', 'vm-homeassistant', 'stop', 'test');
    expect(r.viable).toBe(true);
    expect(r.ttlMs).toBeGreaterThan(0);
  });

  it('blocks jellyfin migrate (demo Rule #8)', async () => {
    const r = await service.check('vm', 'vm-jellyfin', 'migrate', 'test');
    expect(r.viable).toBe(false);
    expect(r.blockers.length).toBeGreaterThan(0);
    expect(r.blockers[0].remediation).toBeTruthy();
  });

  it('caches within ttl', async () => {
    const a = await service.check('vm', 'vm-x', 'start', 'test');
    const b = await service.check('vm', 'vm-x', 'start', 'test');
    expect(a.fetchedAt).toBe(b.fetchedAt);
  });

  it('invalidate drops cache', async () => {
    await service.check('vm', 'vm-y', 'stop', 'test');
    service.invalidate('vm', 'vm-y');
    const again = await service.check('vm', 'vm-y', 'stop', 'test');
    expect(again).toBeTruthy();
  });
});
