[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/dljrealty-guesty-mcp-server-badge.png)](https://mseep.ai/app/dljrealty-guesty-mcp-server)

# Guesty MCP Server

[![npm version](https://img.shields.io/npm/v/guesty-mcp-server)](https://www.npmjs.com/package/guesty-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The first MCP (Model Context Protocol) server for [Guesty](https://guesty.com) property management. Connect any MCP-compatible AI client (Claude, ChatGPT, Copilot, Cline) to your Guesty account — manage reservations, communicate with guests, track finances, update pricing.

**Live now:** 23 free read-only tools — reservations, listings, guests, calendars, financial reports, operations, reviews, and webhook reads. The full 43-tool surface (write/destructive ops + webhook management) is planned behind a paid tier; availability will be announced in the release notes.

**Why MCP:** Guesty is one of the larger PMS platforms in the short-term-rental space and no MCP integration existed. Every major PMS will need one — we built the first.

**Built in production** on 10 of our own short-term rentals. Node.js + MCP SDK + Express, MIT licensed. Things we learned: Guesty's `/reservations` endpoint only returns future data (we use the calendar endpoint for historical), and the SSE transport doesn't run on Vercel serverless (expected). **The first and only MCP server for Guesty — 23 free read-only tools live now.**

Full tool surface: **43 tools registered** — 23 free read-only Guesty tools live now, plus `get_license_info`, which reports this server's own licensing state and makes no Guesty API call. A **Pro** tier would add **15 gated tools**: 14 write/guest-messaging operations plus `get_conversations`, which is read-only but is gated because it returns message content. An **Enterprise IoT** add-on (`get_readiness_score`, `get_property_health`, `submit_checkout_photos`, `get_maintenance_alerts`) sits above that. **Paid tiers are not yet available and no release date is set.**

> **Want AI to handle your guest messages 24/7?** [Guesty Copilot](https://guestycopilot.com) -- AI guest management for Guesty hosts, built on this MCP server. Now in beta.

> **Stay updated:** [Sign up for release notes and new tool announcements](https://guestycopilot.com#signup)

> **Paid tiers are not yet available.** 23 free read-only tools are live now: reservations, listings, guests, calendars, financial reports, operations, reviews, and webhook reads. There is no license key to buy or enter yet, and the free tier needs none. Paid-tier license keys are recognized but refused with a message saying paid tiers are not yet available — set or omit `GUESTY_MCP_LICENSE_KEY` and you get the free tier either way.

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

### Server & Licensing
| Tool | Description |
|------|-------------|
| `get_license_info` | Report this MCP server's own licensing state — active tier, which tools are permitted, and whether paid tiers are available. Makes no Guesty API call. |

This tool is available on the free tier. It is counted in the 43 registered tools but **not** in the "23 free read-only Guesty tools" figure, because it reports our licensing state rather than doing anything with your Guesty account: 23 Guesty tools + this one = the 24 tools the free tier can call.

### Enterprise Tier
| Tool | Description |
|------|-------------|
| `get_readiness_score` | Composite turnover-readiness score for a property from cleaning, maintenance, and IoT signals |
| `get_property_health` | Aggregate health signal per property: reservation status, open maintenance alerts, review-score, last-clean timestamp, IoT hub status |
| `submit_checkout_photos` | Accept post-checkout photo uploads and log them to the property's maintenance/cleaning record |
| `get_maintenance_alerts` | List or filter open maintenance alerts for a property or portfolio |

These four tools are gated to the Enterprise tier. Paid tiers are not yet available, so they cannot be unlocked today — they are documented here for completeness. Availability will be announced in the release notes.

## Use Cases

- **Guest Communication**: guest-messaging tools draft and send replies grounded in real reservation data
- **Revenue Management**: Pull financial reports, analyze occupancy, optimize pricing
- **Operations**: Track check-ins/outs, coordinate cleaning schedules, manage availability
- **Marketing**: Identify low-occupancy periods, create targeted promotions
- **Connected Tools**: give every MCP-compatible client in your stack access to the same property data

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

[DLJ Properties](https://tinyhomeboutiques.com) -- Battle-tested on our own 10-property STR portfolio. Built for our own use, shared with the STR community.

## License

MIT
