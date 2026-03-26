# Guesty MCP Server

The first MCP (Model Context Protocol) server for [Guesty](https://guesty.com) property management. Connect AI agents directly to your Guesty account to manage reservations, communicate with guests, track finances, and update pricing -- all autonomously.

## Features

| Tool | Description |
|------|-------------|
| `get_reservations` | Fetch reservations with filters (dates, listing, status, guest) |
| `get_listing` | Get property details or list all properties |
| `get_conversations` | Fetch guest message history |
| `send_guest_message` | Send messages to guests in conversations |
| `get_financials` | Revenue, payouts, and commission data |
| `update_pricing` | Update base price or date-specific pricing |

## Quick Start

### 1. Get Guesty API Credentials

1. Log into [Guesty Dashboard](https://app.guesty.com)
2. Go to **Settings > API** (or Marketplace > API Credentials)
3. Create an API application with `open-api` scope
4. Copy your **Client ID** and **Client Secret**

### 2. Install

```bash
git clone https://github.com/DLJRealty/guesty-mcp-server.git
cd guesty-mcp-server
npm install
```

### 3. Configure

Set your Guesty credentials as environment variables:

```bash
export GUESTY_CLIENT_ID="your-client-id"
export GUESTY_CLIENT_SECRET="your-client-secret"
```

### 4. Add to Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "guesty": {
      "command": "node",
      "args": ["/path/to/guesty-mcp-server/src/server.js"],
      "env": {
        "GUESTY_CLIENT_ID": "your-client-id",
        "GUESTY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### 5. Use

Once connected, your AI agent can:

```
"Show me all reservations checking in this week"
"What's the total revenue for March?"
"Send a welcome message to the guest checking in tomorrow"
"Update the base price for Unit Y to $159"
"List all my properties with their current status"
```

## Use Cases

- **Guest Communication**: AI agents auto-respond to guest inquiries using real reservation data
- **Revenue Management**: Pull financial reports, analyze occupancy, optimize pricing
- **Operations**: Track check-ins/outs, coordinate cleaning schedules, manage availability
- **Marketing**: Identify low-occupancy periods, create targeted promotions
- **Multi-Agent Teams**: Give your entire AI team (CEO, Marketing, CS, Ops) access to property data

## Requirements

- Node.js 18+
- Guesty account with API access (Professional plan or higher)
- MCP-compatible AI client (Claude Code, OpenClaw, etc.)

## API Reference

This server wraps the [Guesty Open API](https://open-api.guesty.com/api-docs). Authentication uses OAuth2 client credentials flow with automatic token caching and refresh.

## Built By

[DLJ Properties](https://tinyhomeboutiques.com) -- Running 7 properties with a fully autonomous AI agent team. Built for our own use, shared with the STR community.

## License

MIT
