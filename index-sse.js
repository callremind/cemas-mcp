import { createServer } from "./server.js";

// HTTP Stream transport (Streamable HTTP) — for ChatGPT / remote MCP clients.
// Endpoint: /mcp  (what ChatGPT connects to).
// No OAuth — the server is unauthenticated (auth relies on the server-side
// CALLREMIND_API_KEY). This keeps the initial handshake working reliably.

const PORT = Number(process.env.CALLREMIND_MCP_PORT || 8921);
const HOST = process.env.CALLREMIND_MCP_HOST || "0.0.0.0";
const ENDPOINT = process.env.CALLREMIND_MCP_ENDPOINT || "/mcp";

const mcp = createServer("CallRemind MCP Server (HTTP)");

await mcp.start({
  transportType: "httpStream",
  httpStream: {
    host: HOST,
    port: PORT,
    endpoint: ENDPOINT,
    health: { enabled: true },
  },
});

console.log(`CallRemind MCP (HTTP Stream) listening on http://${HOST}:${PORT}${ENDPOINT}`);
console.log(`OAuth: disabled (unauthenticated — server uses CALLREMIND_API_KEY)`);
