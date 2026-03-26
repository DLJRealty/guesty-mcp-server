import { createServer } from "http";

const startTime = Date.now();
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || "3003", 10);

export function startHealthCheck(guestyAuthFn) {
  const server = createServer(async (req, res) => {
    if (req.url !== "/health" && req.url !== "/") {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);
    let guestyStatus = "unknown";

    try {
      await guestyAuthFn();
      guestyStatus = "connected";
    } catch (e) {
      guestyStatus = `error: ${e.message}`;
    }

    const health = {
      status: guestyStatus === "connected" ? "healthy" : "degraded",
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
      guestyApi: guestyStatus,
      toolCount: 15,
      version: "0.2.0",
      transport: "stdio",
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(health, null, 2));
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[health] Health check endpoint at http://localhost:${HEALTH_PORT}/health`);
  });

  return server;
}
