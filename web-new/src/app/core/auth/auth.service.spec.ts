import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthSessionStore } from './auth-session.store';

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthSessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthSessionStore);
    store.clear();
  });

  it('starts unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('mock login sets a session', async () => {
    await service.login('admin', 'admin');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.username).toBe('admin');
    expect(service.frosted()).toBe(false);
    expect(store.sessionId()).toBeTruthy();
  });

  it('handleSessionFailure frosts and clears user', async () => {
    await service.login('admin', 'admin');
    service.handleSessionFailure();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.frosted()).toBe(true);
  });
});
