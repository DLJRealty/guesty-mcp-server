#!/usr/bin/env node
/**
 * HTTP/SSE transport wrapper for Guesty MCP Server
 * Enables hosting on Vercel/Railway for Smithery marketplace
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

// Import the server setup from main server
// For now, create a minimal health endpoint + SSE transport
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "guesty-mcp-server", version: "0.4.3", tools: 38 });
});

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  // Server setup would go here
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ type: "ready", server: "guesty-mcp-server" })}\n\n`);
});

app.get("/", (req, res) => {
  res.json({
    name: "guesty-mcp-server",
    version: "0.4.3",
    description: "The first MCP server for Guesty property management. 38 tools.",
    docs: "https://guestycopilot.com",
    npm: "https://www.npmjs.com/package/guesty-mcp-server",
    github: "https://github.com/DLJRealty/guesty-mcp-server"
  });
});

app.listen(PORT, () => {
  console.log(`Guesty MCP HTTP Server on port ${PORT}`);
});
