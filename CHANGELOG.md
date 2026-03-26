# Changelog

All notable changes to the Guesty MCP Server will be documented in this file.

## [0.2.0] - 2026-03-26

### Added
- `create_reservation` - Create direct bookings (website → Guesty)
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
