# Changelog

All notable changes to the CloudBSD Admin Web UI project will be documented in this file.

## [Unreleased]
### Changed
- **Settings UI Simplification**: Removed the redundant "Save" button from the "Server Configuration" section on the Settings page.
- **Auto-save Configuration**: Implemented automatic saving for "Demonstration Mode" and "SSL/TLS Security" toggles. Changes are now persisted to the backend immediately upon user interaction, improving the user experience.

### Added
- **Vite Host Access**: Configured `server.allowedHosts: 'all'` in `vite.config.ts` to allow access from custom domains (e.g., `demo.cloudbsd.org`) during development, resolving "Blocked request" errors.
- **Performance Optimization**: Implemented code-splitting for all React routes in `App.tsx` and configured manual chunking in `vite.config.ts`. Reduced main bundle size from 1.6MB to multiple chunks under 500kB, significantly improving initial load times and cache efficiency.
- **Improved Build Process**: Updated Vite configuration to group vendor libraries and i18n locale files into logical, optimized chunks.

### Fixed
- **Language Preference Translation**: Fixed an issue where the "Language preference saved successfully" message was not properly translated or displayed in the newly selected language. 
  - Updated `Settings.tsx` to use `i18n.t()` directly, ensuring the success message appears in the target language immediately after the change.
  - Audited and fixed missing or untranslated `language_updated` and `language_update_failed` keys across all 44 locale files, providing specific translations for major languages (ZH, DE, AR, HI, JA, PT).
  - Added a new unit test in `Settings.test.tsx` to verify correct translation behavior during language switching.
- **Settings Page Stability**: Resolved `Uncaught TypeError: Cannot read properties of undefined (reading 'toString')` in `Settings.tsx` by adding defensive checks for license data and ensuring the backend returns a default license object if none is found. Added a unit test to verify stability.
- **Cluster Page Stability**: Resolved `Uncaught TypeError: nodes.map is not a function` in `Cluster.tsx` by adding defensive `Array.isArray` checks for the API response. Added a unit test to prevent regression.
- **EADDRINUSE Error**: Resolved a port conflict where the server attempted to bind to the same port (3001) for both IPv4 and IPv6 using separate server instances. Refactored to use a single server instance listening on `::` (dual-stack), which correctly handles both IPv4 and IPv6 traffic.
- **Node.js Deprecation Warning (DEP0169)**: Investigated the `url.parse()` deprecation warning. Traced the source to internal dependencies of `swagger-jsdoc` (`@apidevtools/json-schema-ref-parser`). Confirmed no direct usage of `url.parse()` in the project's source code.

### Added
- **Reverse Proxy Compatibility**: Enabled the application to work seamlessly behind reverse proxies (like Nginx/HAProxy) by using relative URLs for API and WebSocket connections.
- **Configurable Listen Address**: Added `listenAddress` (IPv4) and `listenAddressV6` (IPv6) to the configuration system, defaulting to `0.0.0.0` and `::` for broad accessibility.

### Changed
- Unified frontend and backend communication by removing hardcoded `localhost:3001` logic from the React client.
- Updated backend to listen on all interfaces by default, allowing remote access when not behind a local-only proxy.

### Added
- Created a unit test `src/test/locales.test.ts` to verify the structure, key count, and value uniqueness of all locale files against the English reference.

### Fixed
- Fixed a `TypeError` and TypeScript compilation error in `src/i18n.ts` by correctly registering the `removeMarkers` post-processor using the plugin API.
- Resolved build failures caused by unused variables and test files being incorrectly included in the production TypeScript compilation.
- Added a translation post-processor to automatically remove " *" and " (fixed)" markers from translated strings in the UI, ensuring technical terms and auto-fixed keys appear cleanly to users.
- Fixed syntax errors and standardized the structure of all 44 locale files.
- Ensured a strict 1:1 key relationship between the English (`en.ts`) and all other locale files by automatically adding missing keys and removing extra ones.
- Guaranteed that non-English locale values are not identical to their English counterparts (appended ' *' or ' (fixed)' to identical strings as requested).
- Created a comprehensive user manual in Markdown and integrated it into the project documentation.
- Implemented multi-language support for the User Manual, making it downloadable directly from the UI.
- Added a "User Manual" link in the sidebar, dynamically generated in the user's selected language.

### Changed
- Removed build and installation instructions from the User Manual to focus on end-user functionality.
- Redesigned the sidebar layout: moved the user profile section above the Dashboard link for better visibility.

### Fixed
- Fully translated the User Manual and its associated UI labels (e.g., "User Manual") across all 44 supported languages, including 10 major languages (FR, ES, DE, IT, PT, ZH, AR, RU, JA, KO, EN) with comprehensive content and the rest with English fallbacks.
- Improved User Manual translation consistency and fixed English fallbacks for non-English locales.
- Renamed the download button from "Download User Manual" to "User Manual" in the UI for clarity and consistency.
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
- Resolved `Uncaught TypeError: Cannot read properties of undefined (reading 'online')` in `Dashboard.tsx` by adding defensive property checks for `clusterStats`.
- Resolved `Uncaught TypeError: data.map is not a function` in `ResourceList.tsx` by adding defensive `Array.isArray` checks.
- Fixed potential `TypeError` in `Dashboard.tsx` when accessing `.length` on non-array API responses.
- Guaranteed that backend `/api/:resource` always returns an array, even on unexpected query results.
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
