### Project Guidelines - CloudBSD Admin Web UI

This document outlines the development standards and project-specific guidelines for the CloudBSD Admin Web UI.

#### 1. General Principles
- **Security First**: All communications must be over SSL/TLS. Use self-signed certificates for local development and Certbot/Let's Encrypt for production.
- **Granularity**: Documentation (especially `PROMPT.md`) must be granular, describing UI layouts, sizes, and object placements to ensure repeatability.
- **Modularity**: Frontend components should be modular and extensible. Use a common core for infrastructure management views (VMs, Containers, Jails).

#### 2. Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, xterm.js, i18next.
- **Backend**: Node.js, Express 5, SQLite (`better-sqlite3`), JWT, socket.io.
- **Testing**: Vitest, React Testing Library.

#### 3. Frontend Standards
- **Responsive Design**: Desktop-first, but fully optimized for mobile devices.
- **Internationalization (i18n)**: All user-facing strings must use `i18next`. Support common languages from North America, South America, Europe, Asia, and Africa.
- **Real-time Updates**: Use WebSockets for live system metrics and terminal access.

#### 4. Backend Standards
- **API Design**: Follow RESTful principles. All endpoints must be documented with Swagger/OpenAPI (available at `/api-docs`).
- **Authentication**: JWT-based. Admin users manage roles and permissions.
- **Configuration**: Priority-based loading: `./etc/config.json` > `/usr/local/etc/cloudbsd/admin-panel/config.json` > Defaults.

#### 5. Documentation & History
- **PROMPT.md**: This is the primary design document. Keep it up-to-date with all features and UI descriptions.
- **History Directive**: Every significant update to `PROMPT.md` must have a snapshot in the `history/` directory.
- **CHANGELOG.md**: Automatically or manually maintain a record of significant changes.

#### 6. Makefile & Build
- Use the provided `Makefile` for all common tasks (`install`, `build`, `test`, `dev`, `server`).
- Use `make-wrapper.sh` to ensure cross-platform compatibility (BSD make vs. GNU make).
- Frontend runs on port 5173, backend on 3001.

#### 7. Testing Information
- **Run Tests**: `npm test` or `make test`.
- **Environment**: Tests run in `jsdom` for browser simulation.
- **Creating Tests**: Place `.test.ts` or `.test.tsx` files in the relevant directory.
- **Example Test**:
```typescript
import { expect, it, describe } from 'vitest';

describe('Verification Test', () => {
  it('verifies that vitest environment is functional', () => {
    expect(1 + 1).toBe(2);
  });
});
```

#### 8. Project Structure
- `src/`: Frontend React components and logic.
- `server/src/`: Backend Express server and database logic.
- `etc/`: Local configuration files.
- `data/`: SQLite database files.
- `pkg/`: Packaging scripts for FreeBSD.
