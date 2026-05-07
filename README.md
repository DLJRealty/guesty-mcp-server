[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/dljrealty-guesty-mcp-server-badge.png)](https://mseep.ai/app/dljrealty-guesty-mcp-server)

# Guesty MCP Server

[![npm version](https://img.shields.io/npm/v/guesty-mcp-server)](https://www.npmjs.com/package/guesty-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The first MCP (Model Context Protocol) server for [Guesty](https://guesty.com) property management. Connect AI agents directly to your Guesty account to manage reservations, communicate with guests, track finances, and update pricing -- all autonomously.

**43 tools** covering reservations, listings, guests, messaging, financials, tasks, calendars, webhooks, and pricing — plus **1 IoT tool** (`get_readiness_score`) and **3 Enterprise-tier aggregators** (`get_property_health`, `submit_checkout_photos`, `get_maintenance_alerts`) for property health aggregation, checkout photo intake, and portfolio maintenance alerts.

> **Want AI to handle your guest messages 24/7?** [Guesty Copilot](https://guestycopilot.com) -- AI guest management for Guesty hosts, built on this MCP server. Now in beta.

> **Stay updated:** [Sign up for release notes and new tool announcements](https://guestycopilot.com#signup)

## Quick Start

```bash
npx guesty-mcp-server
```

Or add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "guesty": {
      "command": "npx",
      "args": ["-y", "guesty-mcp-server"],
      "env": {
        "GUESTY_CLIENT_ID": "your-client-id",
        "GUESTY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Get Guesty API Credentials

1. Log into [Guesty Dashboard](https://app.guesty.com)
2. Go to **Settings > API** (or Marketplace > API Credentials)
3. Create an API application with `open-api` scope
4. Copy your **Client ID** and **Client Secret**

## All 43 Tools

### Reservations & Guests
| Tool | Description |
|------|-------------|
| `get_reservations` | Fetch reservations with filters (dates, listing, status, guest) |
| `create_reservation` | Create direct bookings (website to Guesty) |
| `update_reservation` | Update reservation status, dates, guest info, or add notes |
| `search_reservations` | Search by guest name, email, or confirmation code |
| `get_reservation_financials` | Detailed financial breakdown for a reservation |
| `create_reservation_note` | Add internal notes to a reservation |
| `get_guests` | Search guest database by name or email |
| `get_guest_by_id` | Get detailed guest profile |

### Listings & Calendar
| Tool | Description |
|------|-------------|
| `get_listing` | Get property details or list all properties |
| `update_listing` | Update title, description, amenities, min nights, max guests |
| `get_calendar` | Check availability and pricing by date |
| `update_calendar` | Block/unblock dates, set minimum nights |
| `get_calendar_blocks` | Get blocked dates with reasons |
| `get_listing_occupancy` | Calculate occupancy rate over a date range |
| `get_photos` | Fetch listing photos with captions |
| `update_photos` | Replace or reorder listing photos |

### Messaging
| Tool | Description |
|------|-------------|
| `get_conversations` | Fetch guest message history |
| `send_guest_message` | Send messages to guests in conversations |

### Financials & Pricing
| Tool | Description |
|------|-------------|
| `get_financials` | Revenue, payouts, and commission data |
| `update_pricing` | Update base price or date-specific pricing |
| `get_listing_pricing` | Get base price, discounts, and fee details |
| `update_listing_pricing` | Update base price, cleaning fee, discounts |
| `get_owner_statements` | Owner revenue statements and reports |
| `get_expenses` | Track operational expenses |
| `create_expense` | Create new expense records |
| `get_revenue_summary` | Aggregated revenue across all listings |

### Operations
| Tool | Description |
|------|-------------|
| `get_tasks` | Fetch cleaning and maintenance tasks |
| `create_task` | Create cleaning or maintenance tasks |
| `get_reviews` | Fetch guest reviews from all channels |
| `respond_to_review` | Post responses to guest reviews |
| `get_channels` | List connected booking channels per property |
| `get_supported_languages` | Get supported languages for a listing |

### Automation & Integrations
| Tool | Description |
|------|-------------|
| `get_automation_rules` | List automation and workflow rules |
| `get_webhooks` | List registered webhooks |
| `create_webhook` | Register new webhook for event notifications |
| `delete_webhook` | Remove a registered webhook |
| `get_custom_fields` | Fetch custom fields for listings or reservations |
| `get_account_info` | Get account info and subscription details |

### Enterprise Tier
| Tool | Description |
|------|-------------|
| `get_property_health` | Aggregate health signal per property: reservation status, open maintenance alerts, review-score, last-clean timestamp, IoT hub status |
| `submit_checkout_photos` | Accept post-checkout photo uploads and log them to the property's maintenance/cleaning record |
| `get_maintenance_alerts` | List or filter open maintenance alerts for a property or portfolio |

Requires `GUESTY_MCP_LICENSE_KEY` with an Enterprise key (`gmcp_ent_*`). See [pricing](https://guestycopilot.com/pricing).

## Use Cases

- **Guest Communication**: AI agents auto-respond to guest inquiries using real reservation data
- **Revenue Management**: Pull financial reports, analyze occupancy, optimize pricing
- **Operations**: Track check-ins/outs, coordinate cleaning schedules, manage availability
- **Marketing**: Identify low-occupancy periods, create targeted promotions
- **Multi-Agent Teams**: Give your entire AI team access to property data

## Requirements

- Node.js 18+
- Guesty account with API access (Professional plan or higher)
- MCP-compatible AI client (Claude Code, Cursor, Windsurf, etc.)

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GUESTY_CLIENT_ID` | — | OAuth2 client id (required) |
| `GUESTY_CLIENT_SECRET` | — | OAuth2 client secret (required) |
| `IOT_WEBHOOK_PORT` | `3100` | Port for the Enterprise-tier IoT webhook receiver stub (`src/webhook/iot-receiver-server.js`). Local/reverse-proxy only — do not expose publicly. Production requires a reverse proxy that terminates TLS and enforces real HMAC against `IOT_WEBHOOK_SECRET`. |

## API Reference

This server wraps the [Guesty Open API](https://open-api.guesty.com/api-docs). Authentication uses OAuth2 client credentials flow with automatic token caching, retry logic, and rate limit handling.

## Built By

[DLJ Properties](https://tinyhomeboutiques.com) -- Running 7 properties with a fully autonomous AI agent team. Built for our own use, shared with the STR community.

## License

MIT
