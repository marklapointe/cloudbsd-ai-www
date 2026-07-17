# CloudBSD Admin Web UI

A modern, responsive web interface for managing Virtual Machines (bhyve), OCI containers, and Jails.

## Features

-   **Dashboard**: Real-time system health monitoring and resource overview.
-   **Documentation**: Detailed [User Manual](USER_MANUAL.md) available.
-   **VM Management**: Control bhyve virtual machines.
-   **Container Management**: Support for OCI-compliant containers (Docker/Podman).
-   **Isolation**: Management of native Jails.
-   **Multi-user Support**: SQLite-backed authentication with role-based permissions.
-   **Internationalization**: Multi-language support for 44 languages across North America, South America, Europe, Asia, and Africa.
-   **Mobile Friendly**: Fully responsive design optimized for mobile devices.

## Tech Stack

-   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
-   **Backend**: Node.js 24+, Express 5, SQLite (`better-sqlite3`), JWT.
-   **Testing**: Vitest, React Testing Library.

## Getting Started

### Prerequisites

-   Node.js (v24 or later)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd cloudbsd-admin
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

1.  Start the backend server:
    ```bash
    npm run server
    ```
    The server will run on `http://localhost:3001`.

2.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The UI will be available at `http://localhost:5173`.

3.  Login with default credentials:
    -   **Username**: `admin`
    -   **Password**: `admin`

### Testing

Run unit tests:
```bash
npm test
```

## Configuration

The application uses a priority-based configuration system. It looks for a `config.json` file in the following locations:

1.  `./etc/config.json` (Local development)
2.  `/usr/local/etc/cloudbsd/admin/config.json` (Production FreeBSD)

Example `config.json`:
```json
{
  "port": 3001,
  "secretKey": "your-secure-key",
  "demoMode": false
}
```

## Project Structure

-   `/src`: React frontend source code.
-   `/server`: Node.js backend source code.
-   `/history`: Historical versions of the project prompts.
-   `PROMPT.md`: Log of accomplishments and features.

## Angular migration (planning)

Branch: `feat/angular-migration`.

**Start here:** [docs/migration/README.md](docs/migration/README.md) (agent plan index + authority order).

| Doc | Purpose |
|-----|---------|
| [Migration index](docs/migration/README.md) | Read order, conflict rules, methodology cheat-sheet |
| [Product IA (ESXi/vSphere)](docs/migration/product-ia-esxi-vsphere-2026-07-16.md) | Sidebar, Settings/Account/System, screen value matrix |
| `.sisyphus/plans/angular-migration.md` | Full migration plan + methodology Rules #1–#9 |
| `.sisyphus/drafts/ui-index.md` | Universal UI ordering rules |
| `.sisyphus/plans/WIRE_PROTOCOL.md` | Wire protocol envelope + preflight |

Target: FreeBSD control plane (bhyve, jails, OCI, ZFS) as ESXi replacement, Angular 20 frontend.

