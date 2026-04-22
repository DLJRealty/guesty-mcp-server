# Changelog

All notable changes to the Guesty MCP Server will be documented in this file.

## [0.9.1] - 2026-04-22

### Fixed
- **Issue #1** — `get_reservations`, `get_revenue_summary`, `get_financials`, and `get_owner_statements` silently ignored `checkInFrom`/`checkInTo`/`from`/`to` date params, returning only upcoming reservations regardless of the requested window. Root cause: `checkIn[$gte]` / `checkIn[$lte]` bracket-style query params are not honored by the Guesty Open API v1. New `buildReservationFilters()` helper emits the correct `filters=[{field, operator, from, to}]` JSON-array shape and moves `listingId` + `status` inside the array so they survive alongside date windows. No `context:"now"` scoping (the original upcoming-only culprit).
- **Issue #1** — `get_listing_occupancy` returned `totalDays: 0` because the calendar response shape wasn't mapped defensively. Now normalizes across `days` / `data` / `results` / bare-array variants, and falls back to a reservation-derived occupancy calculation when the calendar endpoint returns no per-day rows.

### Added
- MCP Resources primitive — 7 addressable `guesty://` templates (listing, reservation, review, guest, thread, report-revenue, listing-tasks) wired via `src/resources.js`. Capabilities now advertise `tools` + `resources` (server-side half of the 0.9.0 ship that was deployed 2026-04-20 but not previously committed).
- `tests/test-issue-1-filters.mjs` — 8-case offline regression covering filter-builder output for historical windows, listing scoping, checkout bounds, and `context:"now"` leak detection.

## [0.8.2] - 2026-04-19

### Fixed
- npm description synced to "43 production tools" (was stale at "38 tools" on npm page)
- Removed `claude-code` and `openclaw` from npm keywords (AI-disclosure hygiene)
- Added `iot` and `enterprise` keywords for discoverability

## [0.8.1] - 2026-04-19

### Fixed
- Added `.npmignore` to exclude token files, tests, and non-essential markdown from npm package
- Added `.mcpregistry_*` patterns to `.gitignore` (credential hygiene)
- Package size reduced from 42.3kB to 35.0kB (26→23 files)

## [0.8.0] - 2026-04-17

### Changed — Enterprise Tier MVP Merge (Owner-approved option-c path, msg 6406)
- Enterprise aggregators (`get_property_health`, `submit_checkout_photos`,
  `get_maintenance_alerts`) now layer Guesty-side data (reservation status,
  review score, last-clean timestamp) on top of IoT helpers. Single-call
  snapshots for ops dashboards.
- IoT-only handlers extracted from `iot-tools.js` to internal async helpers
  (`getIoTPropertyHealth`, `submitIoTCheckoutPhotos`, `getIoTMaintenanceAlerts`);
  canonical MCP tool registration moved to `enterprise-tools.js`.
- Graceful degradation: Guesty sub-fetch failures degrade to null value +
  per-field error note (aggregator still returns IoT data).
- `iot-tools.js` retains single MCP registration for `get_readiness_score`.
- Tool count reconciled across README + license.js + package.json + server.json
  to 43 total (39 Guesty + 1 IoT + 3 Enterprise aggregators). Previous 3-way
  drift (README:38, license.js:38, actual registrations:43) resolved.

### Added
- `__handlers` export on `enterprise-tools.js` for direct smoke-test invocation
  (renamed from legacy `__stubs` — real handlers, not stubs, post-merge).
- `tests/test-enterprise.js` rewritten: exports + free-tier-gate + enterprise-lift
  smoke tests. Dynamic import + env-stub so test runs without real Guesty creds.

### Fixed
- `package.json` test script referenced non-existent `tests/test-tools.js`.
  Now runs `tests/test-enterprise.js && tests/test-iot.js`.

## [0.7.0] - 2026-04-15

### Added
- **IoT/Property Health Monitoring** (Enterprise tier)
  - `get_property_health` — Real-time device status for any property
  - `submit_checkout_photos` — Photo submission for post-checkout analysis
  - `get_maintenance_alerts` — Active IoT alerts filtered by property/severity
  - `get_readiness_score` — 0-100 Physical Readiness Score with 6 weighted checks
- **IoT Webhook Receiver** (`POST /webhooks/iot`)
  - Supports Tuya, Google Nest, SmartThings, and generic payloads
  - Auto-normalizes all formats to standard schema
  - Auto-creates alerts for out-of-range readings
- **IoT Data Layer** (`iot-db.js`)
  - Zero-dependency JSON file store for devices, readings, alerts, baselines
  - Auto-pruning at 50K readings and 10K alerts
- Tool count: 38 → 42 (4 new Enterprise-tier tools)

## [0.6.0] - 2026-04-10

### Added
- **License tier gating** — 3-tier monetization (Free/Pro/Business/Enterprise)
  - 23 free tools (read-only operations)
  - 15 gated tools (write operations, messaging, webhooks)
  - License key validation via `GUESTY_MCP_LICENSE_KEY` env var
- **MCP annotations** on all 38 tools (`readOnlyHint`, `destructiveHint`)
- **Enhanced rate limiting** with exponential backoff and retry-after header support
- Streamable HTTP remote endpoint via Vercel deployment
- License key environment variable documented in server.json

### Changed
- Upgraded from v0.5.0 monetization foundation to production-ready gating
- Improved server.json with full environment variable documentation
- Version bumped across all entry points (server.js, http-server.js, cli.js)

## [0.5.0] - 2026-04-07

### Added
- License tier system (`src/license.js`) for Pro/Business/Enterprise gating
- MCP annotations on all 38 tools for better client-side filtering

## [0.4.3] - 2026-03-27

### Changed
- Updated package description to reflect full 38-tool capability
- Updated CHANGELOG with complete version history (v0.3.0–v0.4.2)

## [0.4.2] - 2026-03-27

### Fixed
- MCP Registry namespace case fix (`io.github.DLJRealty/guesty`)
- Added `.gitignore` entry for token files

## [0.4.1] - 2026-03-27

### Fixed
- Server.json description length exceeding MCP Registry limits

## [0.4.0] - 2026-03-27

### Added
- MCP Registry `server.json` and Smithery `smithery.yaml` config
- `mcpName` field in package.json for registry discovery
- Expanded from 29 to **38 tools**:
  - `get_reservation_financials` - Detailed financial breakdown per reservation
  - `get_reservation_notes` - Internal notes on reservations
  - `add_reservation_note` - Add notes to reservations
  - `get_listing_pricing` - Pricing rules and rate plans
  - `get_account_info` - Guesty account details
  - `create_webhook` - Register webhooks for real-time events
  - `delete_webhook` - Remove registered webhooks
  - `get_custom_fields` - Custom field definitions
  - `update_custom_fields` - Update custom field values
- Delete helper utility for webhook management
- Improved error handling across all tools

### Fixed
- 5 failing tools identified and fixed via E2E test against live Guesty API

## [0.3.0] - 2026-03-26

### Added
- Expanded from 15 to **29 tools**:
  - `get_photos` - Property photo URLs and metadata
  - `get_guest` - Guest profile details
  - `get_guests` - Search and list guests
  - `get_occupancy_stats` - Occupancy rates and statistics
  - `get_revenue_stats` - Revenue analytics and trends
  - And additional operational tools
- Docker support with `Dockerfile` and `docker-compose.yml`
- HTTP transport module for remote MCP access (non-stdio)
- Integration test suite (`tests/test-tools.js`) for all tools
- CLI tool (`guesty-cli`) for command-line usage
- Security guide (`SECURITY.md`)
- Health check endpoint for production monitoring
- Webhook handler module for real-time Guesty events (v3 prep)
- Multi-account design doc for v3 architecture
- GitHub Actions CI workflow
- Example configs for Claude Code and Docker Compose

## [0.2.0] - 2026-03-26

### Added
- `create_reservation` - Create direct bookings (website to Guesty)
- `get_reviews` - Fetch guest reviews from all channels
- `get_calendar` - Check availability and pricing by date range
- `update_calendar` - Block/unblock dates, set minimum nights
- `respond_to_review` - Post responses to guest reviews
- `get_owner_statements` - Owner revenue statements and reports
- `get_expenses` - Track operational expenses
- `get_channels` - List connected booking channels per property
- `get_tasks` - Fetch cleaning and maintenance tasks
- Rate limit retry with exponential backoff
- Token caching module

## [0.1.0] - 2026-03-26

### Added
- Initial release with 6 core tools
- `get_reservations` - Fetch reservations with date/listing/status filters
- `get_listing` - Get property details or list all properties
- `get_conversations` - Fetch guest message history
- `send_guest_message` - Send messages to guests in conversations
- `get_financials` - Revenue, payouts, and commission data
- `update_pricing` - Update base price or date-specific pricing
- OAuth2 authentication with automatic token refresh
- CONTRIBUTING.md for open source contributors
- MIT License
