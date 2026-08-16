# CallRemind MCP Server

MCP (Model Context Protocol) server that lets AI agents interact with the
CallRemind REST API — place instant calls, manage CEMAS notifications, pick Edge
TTS voices, manage agents/leads/scheduled calls, and query call history.

Targets the **CallRemind REST API** (`https://api.callremind.my/v1`), not the
outbound engine.

## Quick start

```bash
npm install
cp .env.example .env   # set CALLREMIND_API_URL + CALLREMIND_API_KEY
npm start              # stdio transport (local MCP clients)
```

### stdio (local clients: Claude Desktop, opencode, etc.)

```json
{
  "mcpServers": {
    "callremind": {
      "command": "node",
      "args": ["/path/to/callremind-mcp/index.js"],
      "env": {
        "CALLREMIND_API_KEY": "your_key"
      }
    }
  }
}
```

### HTTP Stream / SSE (remote clients: ChatGPT, etc.)

```bash
npm run start:sse            # listens on http://0.0.0.0:8921/mcp
# or
CALLREMIND_MCP_PORT=8921 CALLREMIND_API_KEY=your_key node index-sse.js
```

Connect your MCP client to `http://<host>:8921/mcp`. Configurable env:
`CALLREMIND_MCP_PORT` (default 8921), `CALLREMIND_MCP_HOST` (default 0.0.0.0),
`CALLREMIND_MCP_ENDPOINT` (default /mcp).

Or build the Docker image:

```bash
docker build -t callremind-mcp .
docker run -e CALLREMIND_API_KEY=your_key callremind-mcp
```

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

## Test connectivity

```bash
npm test   # or: node test-api.js
```
