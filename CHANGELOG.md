# Changelog

All notable changes to the CloudBSD Admin Web UI project will be documented in this file.

## [Unreleased]

### Added
- Created a comprehensive user manual in Markdown and integrated it into the project documentation.
- Implemented multi-language support for the User Manual, making it downloadable directly from the UI.
- Added a "Download User Manual" link in the sidebar, dynamically generated in the user's selected language.

### Changed
- Removed build and installation instructions from the User Manual to focus on end-user functionality.
- Redesigned the sidebar layout: moved the user profile section above the Dashboard link for better visibility.

### Fixed
- Simplified the `Settings` page by removing unnecessary read-only fields: `servername`, `port`, and `database file path`.
- Fixed an issue where the 'Language preference saved successfully' message was not translated or shown correctly in all languages due to missing i18n keys.
- Ensured all 44 locale files have the required keys for settings update feedback.

### Added
- Integrated frontend static file serving into the Node.js backend, enabling the complete application to run from a single server instance.
- Implemented SPA routing support with a catch-all handler for the React frontend, using a RegExp pattern (`/^(?!\/api).+/`) to bypass strict `path-to-regexp` v8 parsing in Express 5.
- Fixed Express 5 `PathError` by using a RegExp-based catch-all route.
- Updated project to use Node.js 24 and its native TypeScript support (`--experimental-strip-types`).
- Simplified `npm run server` script to use Node 24's built-in `--experimental-strip-types` and `--watch`.
- Rebuilt `better-sqlite3` for Node.js 24 compatibility.
- Language selection picker on the Login page, allowing users to choose their preferred language before authenticating.
- Shared language constant and sorting logic in `src/constants/languages.ts` to ensure consistency across the application.
- Enhanced Login UI with a modern, compact language dropdown in the footer.
- Localhost-only binding for the Express server, ensuring it only listens on `127.0.0.1` (IPv4) and `::1` (IPv6). Fixed by creating separate server instances for IPv4 and IPv6 to avoid `ERR_SERVER_ALREADY_LISTEN`.
- FreeBSD-specific installation target `install-freebsd` in the root `Makefile` to automate deployment on FreeBSD systems.
- Robust FreeBSD RC script template (`pkg/cloudbsd-admin.rc.in`) with `node24` and `daemon` integration for service monitoring and PID management.
- Enhanced RC script with improved PID file handling (ensuring positive PIDs via `daemon -P`) and pre-stop/pre-restart checks to verify the service is running.
- Path mapping in `Makefile` to support FreeBSD standard locations (`/usr/local/www/cloudbsd-admin`, `/usr/local/etc/cloudbsd/admin-panel`).
- Automatic configuration sample installation (`config.json.sample`) on FreeBSD.
- Mandatory support for 44 languages, including real-world and fictional languages (Klingon, Elvish, Dothraki, High Valyrian, Na'vi, Atlantean).
- Comprehensive translation of all UI strings across all 44 supported languages.
- Native language name support in all language selection menus.
- Consistent sorting of language lists: English first, followed by alphabetical order of native names.

### Fixed
- Fixed the "crazylike" page reloading issue by excluding the `/login` endpoint and the login page itself from the automatic Axios 401/403 redirect interceptor, ensuring incorrect credentials show an error message instead of refreshing the page.
- Improved the `NetworkMap` layout and behavior:
  - Persisted user-defined node positions across data refreshes to prevent "snapping back" when moving items.
  - Increased spacing between host nodes and expanded the resource semi-circle radius to reduce grouping.
  - Fixed a bug where `fitView` was triggered on every refresh, potentially overriding user zoom/pan.
- Fixed missing translation for `common.storage` across all locales.
- Fixed missing and inconsistent translations for license features on the Settings page (e.g., `feature_clustering`).
- Standardized feature translation keys and ensured 100% parity across all 44 supported languages.
- Added safety fallback for feature translations in the UI.
- Fixed a duplication of the word "Cores" on the Dashboard by removing the hardcoded unit from the backend API and relying on the localized frontend label.
- Improved `ResourceList` internationalization to ensure "Add Resource" button labels are correctly localized in all 44 languages by using language-agnostic resource type keys.
- Fixed a bug where translated resource names were incorrectly used to construct i18n lookup keys (e.g., `common.add_contenedor` instead of `common.add_container` in Spanish).
- Harmonized audit log action translation keys (e.g., `LOGIN_SUCCESS` now uses `action_login_success`) and ensured 100% parity across all 44 languages.
- Updated `Logs.tsx` to handle dynamic log details and prevent incorrect translation fallbacks for strings containing specific keywords.
- Missing `common.storage` translation key across all 44 locale files.
- Missing translation keys across multiple locale files (`es`, `ro`, `hr`, `sl`, `pa`, `elv`, `qav`, `qvy`, `atl`, `doth`).
- Inconsistent language names in `Settings` and `Users` pages.
- Synchronization of all translation files with the primary English master file.

### Added
- Esperanto (eo) translation support.
- Project-specific guidelines in `.junie/guidelines.md`.
- Expanded internationalization (i18n) support for common languages in North America, South America, Europe, Asia, and Africa.
- Added Portuguese (pt-BR), Japanese (ja), Hindi (hi), Korean (ko), Arabic (ar), Swahili (sw), and Yoruba (yo) locales.
- `CHANGELOG.md` for tracking project evolution.

### Fixed
- Updated `README.md` and `PROMPT.md` to reflect recent features and project status.
- Fixed API endpoint inconsistency for license registration in `Settings` page.
- Fixed missing and hardcoded language options in `Settings` page dropdown.
- Fixed Role-Based Access Control (RBAC) in `Layout` to ensure `operator` users can access `Settings`.
- Corrected missing i18n translation keys in multiple locales (`en`, `es`, `fr`, `de`).
- Fixed session invalidation handling by adding an Axios response interceptor that automatically redirects users to the login page on 401/403 errors.
- Fixed language selection dropdown to display native language names and ensure alphabetical sorting with English at the top.
- Fully internationalized the UI, including sidebar titles ("Admin Panel", "Main Menu"), Settings subtitle, and system alerts across all supported languages.

### Added
- Comprehensive unit tests for the `Settings` page (`src/pages/Settings.test.tsx`), `Cluster` page (`src/pages/Cluster.test.tsx`), and `Dashboard` page (`src/pages/Dashboard.test.tsx`).
- Full internationalization audit and implementation across all system sections.
- Support for translated resource units (vCPUs, Mbps, GB/TB).
- Native language labels for all resource statuses (Running, Stopped, Up, Active, etc.).
- Complete i18n support for Resource and Console modals.
- Search functionality in `ResourceList` with internationalized placeholders.

### Fixed
- Hardcoded strings in `Cluster Management` and `Dashboard` pages.
- Missing labels and units in resource boxes.
- Non-internationalized error and success messages in modals.
- Sync issues between English and Spanish locales.
- Redundant English strings in Sidebar and Layout subtitles.
- Improved accessibility by using i18n keys for all user-facing ARIA labels and titles.

## [0.1.0] - 2026-03-01

### Added
- Project Initialization with React + TypeScript + Vite + Tailwind CSS.
- Express backend with SQLite persistence.
- JWT-based authentication and Role-Based Access Control (RBAC).
- Responsive UI with sidebar and dashboard.
- Infrastructure management for VMs, Containers, and Jails.
- Real-time updates via WebSockets.
- SSL/TLS support with automatic certificate generation.
- xterm.js integration for terminal access.
- System health monitoring (CPU, RAM, Disk, Network).
- Swagger/OpenAPI documentation.
- Containerization with SSL support.
- FreeBSD `pkg` port and rc.d script.
- Comprehensive `Makefile` and `make-wrapper.sh`.
