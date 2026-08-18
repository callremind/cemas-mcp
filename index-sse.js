import { GitHubProvider, OAuthProvider } from "fastmcp";
import { createServer } from "./server.js";

// HTTP Stream transport (Streamable HTTP) for ChatGPT / remote MCP clients.
// ChatGPT REQUIRES OAuth discovery, so OAuth is enabled by default via GitHub
// (or a generic OAuth 2.0 provider). The server exposes:
//   /.well-known/oauth-authorization-server
//   /.well-known/oauth-protected-resource
//   /oauth/*  (authorize, token, callback, consent, register)
// Tools remain usable; sensitive ones can later be gated with canAccess.
//
// Env:
//   CALLREMIND_MCP_PORT (8921), CALLREMIND_MCP_HOST (0.0.0.0),
//   CALLREMIND_MCP_ENDPOINT (/mcp), CALLREMIND_MCP_BASE_URL (public https URL),
//   GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET  (GitHub OAuth app)
//   or OAUTH_* for a generic OAuth 2.0 provider.

const PORT = Number(process.env.CALLREMIND_MCP_PORT || 8921);
const HOST = process.env.CALLREMIND_MCP_HOST || "0.0.0.0";
const ENDPOINT = process.env.CALLREMIND_MCP_ENDPOINT || "/mcp";
const BASE_URL = process.env.CALLREMIND_MCP_BASE_URL || `http://${HOST}:${PORT}`;

function buildAuth() {
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return new GitHubProvider({
      baseUrl: BASE_URL,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scopes: ["read:user", "user:email"],
    });
  }
  if (process.env.OAUTH_AUTHORIZATION_ENDPOINT && process.env.OAUTH_TOKEN_ENDPOINT) {
    return new OAuthProvider({
      baseUrl: BASE_URL,
      clientId: process.env.OAUTH_CLIENT_ID || "",
      clientSecret: process.env.OAUTH_CLIENT_SECRET || "",
      authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
      scopes: (process.env.OAUTH_SCOPES || "openid profile").split(",").map((s) => s.trim()).filter(Boolean),
    });
  }
  return null;
}

const auth = buildAuth();
const mcp = createServer("CallRemind MCP Server (HTTP)", { auth });

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
console.log(`OAuth: ${auth ? "enabled (GitHub/generic)" : "disabled (no GITHUB_*/OAUTH_* env)"}`);
