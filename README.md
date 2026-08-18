# CallRemind MCP Server

MCP (Model Context Protocol) server that lets AI agents interact with the
**CallRemind REST API** — place instant calls, manage CEMAS emergency
notifications, pick Edge TTS voices, manage agents/leads/scheduled calls, and
query call history.

Targets the **CallRemind REST API** (`https://api.callremind.my/v1`), not the
outbound engine.

---

## Table of contents

- [Requirements](#requirements)
- [Two ways to run](#two-ways-to-run)
  - [A. npm package (easiest)](#a-npm-package-easiest)
  - [B. From source / Docker](#b-from-source--docker)
- [Configuration](#configuration)
- [Client setup](#client-setup)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code](#claude-code)
  - [Codex (OpenAI CLI)](#codex-openai-cli)
  - [ChatGPT (remote, HTTP/SSE)](#chatgpt-remote-httpsse)
  - [opencode](#opencode)
  - [Cursor](#cursor)
  - [Generic HTTP/SSE clients](#generic-httpsse-clients)
- [Tools](#tools)
- [Testing](#testing)

---

## Requirements

- Node.js **>= 18**
- A CallRemind **API key** (your user `x-api-key`). Get it from your
  CallRemind profile, or the admin `/v1/admin/generate-key` endpoint.

---

## Two ways to run

### A. npm package (easiest)

Install the CLI (stdio) and run it directly:

```bash
npm install -g callremind-mcp
CALLREMIND_API_KEY=your_key callremind-mcp
```

For an HTTP/SSE server (remote clients like ChatGPT):

```bash
CALLREMIND_API_KEY=your_key CALLREMIND_MCP_PORT=8921 npx callremind-mcp index-sse.js
```

### B. From source / Docker

```bash
git clone git@github.com:callremind/cemas-mcp.git
cd cemas-mcp
npm install
cp .env.example .env   # fill in CALLREMIND_API_URL + CALLREMIND_API_KEY

npm start               # stdio (local clients)
npm run start:sse       # HTTP/SSE on http://0.0.0.0:8921/mcp
```

Docker:

```bash
docker build -t callremind-mcp .

# stdio
docker run --rm -e CALLREMIND_API_KEY=your_key callremind-mcp

# HTTP/SSE
docker run --rm -p 8921:8921 -e CALLREMIND_API_KEY=your_key callremind-mcp node index-sse.js
```

---

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `CALLREMIND_API_URL` | `https://api.callremind.my/v1` | CallRemind REST API base |
| `CALLREMIND_API_KEY` | — | Your `x-api-key` (required) |
| `CALLREMIND_MCP_PORT` | `8921` | HTTP/SSE port (index-sse.js only) |
| `CALLREMIND_MCP_HOST` | `0.0.0.0` | HTTP/SSE bind host |
| `CALLREMIND_MCP_ENDPOINT` | `/mcp` | HTTP/SSE MCP endpoint path |

---

## Client setup

### Claude Desktop

Edit `claude_desktop_config.json` (Claude Desktop → Settings → Developer →
Edit Config):

```json
{
  "mcpServers": {
    "callremind": {
      "command": "npx",
      "args": ["-y", "callremind-mcp"],
      "env": { "CALLREMIND_API_KEY": "your_key" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add callremind -- npx -y callremind-mcp
# or with env:
claude mcp add callremind -e CALLREMIND_API_KEY=your_key -- npx -y callremind-mcp
```

### Codex (OpenAI CLI)

```bash
codex mcp add callremind -- npx -y callremind-mcp
# pass the key via shell env so it reaches the child process:
CALLREMIND_API_KEY=your_key codex
```

### ChatGPT (remote, HTTP/SSE)

This server uses **OAuth 2.0 (GitHub)** for authentication (required by ChatGPT).
Run the server with `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` set, then in
ChatGPT add a custom MCP server with URL:

```
https://mcp.callremind.my/mcp
```

ChatGPT will discover OAuth (via `/.well-known/oauth-protected-resource`),
redirect you to GitHub to authorize, then connect. The GitHub OAuth App's
**Authorization callback URL** must be:

```
https://mcp.callremind.my/oauth/callback
```

### opencode

`opencode.json` (or `~/.config/opencode/opencode.json`):

```json
{
  "mcp": {
    "callremind": {
      "type": "local",
      "command": ["npx", "-y", "callremind-mcp"],
      "environment": { "CALLREMIND_API_KEY": "your_key" },
      "enabled": true
    }
  }
}
```

### Cursor

Cursor → Settings → MCP → Add server:

```json
{
  "mcpServers": {
    "callremind": {
      "command": "npx",
      "args": ["-y", "callremind-mcp"],
      "env": { "CALLREMIND_API_KEY": "your_key" }
    }
  }
}
```

### Generic HTTP/SSE clients

For any MCP client that supports remote HTTP servers:

```
Transport: Streamable HTTP
URL:       http://<host>:8921/mcp
```

---

## Tools

| Tool | Endpoint | Purpose |
|------|----------|---------|
| `makeInstantCall` | `POST /v1/calls/instant` | Immediate outbound AI call |
| `getCemasConfig` | `GET /v1/cemas` | CEMAS config + voice prefs |
| `saveCemasConfig` | `PUT /v1/cemas/destination` | Save destination + voice/prosody |
| `listEdgeVoices` | `GET /v1/tts/edge-voices` | List Edge TTS voices |
| `previewEdgeVoice` | `POST /v1/tts/edge-preview` | Synthesize voice preview |
| `listVoiceClones` / `createVoiceClone` | `/v1/voice-clones` | Manage voice clones |
| `listAgents` / `createAgent` / `updateAgent` | `/v1/agents` | Manage AI agents |
| `listLeads` / `createLead` | `/v1/contacts` | Manage contacts/leads |
| `listScheduledCalls` / `createScheduledCall` | `/v1/scheduled-calls` | Schedule calls |
| `listCallLogs` | `/v1/call-logs` | Call history |
| `getReports` | `/v1/reports` | Call analytics |
| `getProfile` / `updateProfile` | `/v1/profile` | Profile management |
| `listWebhookConfigurations` / `upsertWebhookConfiguration` | `/v1/webhooks/...` | Webhooks |

---

## Testing

```bash
npm test   # or: node test-api.js  (hits /v1/profile with your key)
```
