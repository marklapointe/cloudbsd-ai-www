# Login Flow

The authentication entry point for the CloudBSD Admin SPA. Validates session state before allowing access to the dashboard.

## Trigger

- User opens the app (cold start or hard reload)
- Session token absent or expired
- Manual navigation to `/login`

## Steps

1. User opens the application URL
2. Pre-flight check runs (token validity, API reachability)
3. Router resolves to `/login` if no valid session
4. User submits credentials (username + password)
5. Backend invokes PAM authentication
6. On success: backend issues session token, sets HttpOnly cookie
7. Frontend receives token, updates auth store
8. Router redirects to `/dashboard`

## Error Cases

- **PAM auth failure**: Display inline error, keep user on `/login`, log attempt
- **Network error**: Show retry banner, allow user to re-attempt
- **Token validation failure**: Clear stored token, force re-auth
- **Account locked (PAM)**: Show lockout message with cooldown timer

## Diagram

```mermaid
flowchart TD
    Start([User opens app]) --> Preflight{Pre-flight check}
    Preflight -->|No valid session| Login[/login page]
    Preflight -->|Valid session| Dashboard
    Login -->|User submits creds| AuthAPI[POST /api/auth/login]
    AuthAPI --> PAM{PAM authenticate}
    PAM -->|Success| IssueToken[Issue session token + cookie]
    PAM -->|Failure| AuthError[Show error, log attempt]
    AuthError --> Login
    IssueToken --> StoreToken[Update auth store]
    StoreToken --> Dashboard[/dashboard]
```

## Related

- Plan section: Authentication & Authorization
- Code module: `web-new/src/app/core/auth/`
- Backend: `backend-new/src/auth/pam-auth.service.ts`