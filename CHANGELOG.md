# Changelog

All notable changes to the Guesty MCP Server will be documented in this file.

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
