# CloudBSD Admin Web UI

A modern, responsive web interface for managing Virtual Machines (bhyve), OCI containers, and Jails.

## Features

-   **Dashboard**: Real-time system health monitoring and resource overview.
-   **VM Management**: Control bhyve virtual machines.
-   **Container Management**: Support for OCI-compliant containers (Docker/Podman).
-   **Isolation**: Management of native Jails.
-   **Multi-user Support**: SQLite-backed authentication with role-based permissions.
-   **Mobile Friendly**: Fully responsive design optimized for mobile devices.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons.
-   **Backend**: Node.js, Express, SQLite (`better-sqlite3`), JWT.
-   **Testing**: Vitest, React Testing Library.

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
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
2.  `/usr/local/etc/cloudbsd/admin-panel/config.json` (Production FreeBSD)

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
