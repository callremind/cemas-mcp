import { createServer } from "./server.js";

// stdio transport — for local MCP clients (Claude Desktop, opencode, etc.)
const mcp = createServer();
await mcp.start({
    transportType: "stdio",
});
