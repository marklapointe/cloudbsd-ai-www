# Changelog

All notable changes to the CloudBSD Admin Web UI project will be documented in this file.

## [Unreleased]

### Added
- Mandatory support for 44 languages, including real-world and fictional languages (Klingon, Elvish, Dothraki, High Valyrian, Na'vi, Atlantean).
- Comprehensive translation of all UI strings across all 44 supported languages.
- Native language name support in all language selection menus.
- Consistent sorting of language lists: English first, followed by alphabetical order of native names.

### Fixed
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
