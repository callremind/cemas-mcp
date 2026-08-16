import { createServer } from "./server.js";

// HTTP Stream transport (modern SSE replacement) — for ChatGPT / remote MCP
// clients that connect over HTTP. Set CALLREMIND_MCP_PORT (default 8921).
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
