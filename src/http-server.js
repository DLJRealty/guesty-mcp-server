#!/usr/bin/env node
/**
 * HTTP/SSE transport for Guesty MCP Server
 * Hosted version for Smithery/MCPMarket marketplace submission
 */
import express from "express";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Server info
const SERVER_INFO = {
  name: "guesty-mcp-server",
  version: "0.4.3",
  description: "The first MCP server for Guesty property management. 38 tools for reservations, guests, messaging, pricing, financials, calendars, reviews, tasks, and webhooks.",
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: false }
  }
};

// Tool definitions (metadata only — execution requires Guesty credentials)
const TOOLS = [
  "list_reservations", "get_reservation", "create_reservation", "update_reservation",
  "list_listings", "get_listing", "update_listing", "list_listing_calendar",
  "update_calendar_availability", "update_calendar_pricing",
  "get_guest", "list_guests", "search_guests",
  "list_conversations", "get_conversation_posts", "send_message",
  "get_financial_summary", "list_owner_payouts", "get_payout_details",
  "list_tasks", "create_task", "update_task",
  "list_reviews", "get_review", "reply_to_review",
  "create_webhook", "list_webhooks", "delete_webhook",
  "get_listing_pricing", "update_listing_base_price",
  "list_listing_photos", "get_listing_availability",
  "check_in_guest", "check_out_guest",
  "list_cleaning_tasks", "assign_cleaning_task",
  "get_revenue_report", "get_occupancy_report", "get_channel_distribution"
];

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", ...SERVER_INFO, tools: TOOLS.length });
});

// Root — server info
app.get("/", (req, res) => {
  res.json({
    ...SERVER_INFO,
    tools: TOOLS.length,
    docs: "https://guestycopilot.com",
    npm: "https://www.npmjs.com/package/guesty-mcp-server",
    github: "https://github.com/DLJRealty/guesty-mcp-server",
    quickstart: "npx guesty-mcp-server"
  });
});

// SSE endpoint for MCP transport
app.get("/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });

  const sessionId = randomUUID();
  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: { sessionId, ...SERVER_INFO } })}\n\n`);

  // Keep alive
  const interval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// MCP JSON-RPC endpoint
app.post("/mcp", (req, res) => {
  const { method, id, params } = req.body;

  switch (method) {
    case "initialize":
      res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", serverInfo: SERVER_INFO, capabilities: SERVER_INFO.capabilities } });
      break;

    case "tools/list":
      res.json({
        jsonrpc: "2.0", id,
        result: {
          tools: TOOLS.map(name => ({
            name,
            description: `Guesty ${name.replace(/_/g, " ")} operation`,
            inputSchema: { type: "object", properties: {} }
          }))
        }
      });
      break;

    case "tools/call":
      res.json({
        jsonrpc: "2.0", id,
        error: { code: -32001, message: "Tool execution requires Guesty API credentials. Install locally: npx guesty-mcp-server" }
      });
      break;

    default:
      res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});

// List tools as REST
app.get("/tools", (req, res) => {
  res.json({ tools: TOOLS, count: TOOLS.length });
});

app.listen(PORT, () => {
  console.log(`Guesty MCP HTTP Server on port ${PORT}`);
});
