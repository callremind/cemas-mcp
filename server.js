import { FastMCP } from "fastmcp";
import axios from "axios";
import { z } from "zod";

// --- SILENCE STDOUT ---
// MCP uses stdout for communication. Any other output will break the protocol.
const originalLog = console.log;
const originalError = console.error;

// Redirect all standard console methods to stderr
console.log = (...args) => originalError(...args);
console.info = (...args) => originalError(...args);
console.warn = (...args) => originalError(...args);

// Patch process.stdout.write to ensure ONLY JSON messages (likely from FastMCP) go to stdout
const stdoutWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
    const str = chunk.toString();
    // FastMCP messages are JSON objects or arrays
    if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
        return stdoutWrite.apply(process.stdout, arguments);
    }
    // Everything else goes to stderr
    return process.stderr.write.apply(process.stderr, arguments);
};

// CallRemind REST API (not the outbound engine). Override with CALLREMIND_API_URL.
const BASE_URL = process.env.CALLREMIND_API_URL || "https://api.callremind.my/v1";
const API_KEY = process.env.CALLREMIND_API_KEY;

if (!API_KEY) {
    originalError("CRITICAL: CALLREMIND_API_KEY environment variable is not set.");
}
// ----------------------

export function createServer(name = "CallRemind MCP Server") {
    const mcp = new FastMCP(name);

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    },
});

// FastMCP tools must return a string (or { content: [...] }); return the API's
// JSON envelope as a JSON string so the client gets the full { ok, data } body.
function toText(data) {
    return JSON.stringify(data);
}

// --- Instant Calls ---

mcp.addTool({
    name: "makeInstantCall",
    description: "Trigger an immediate outbound AI voice call via /v1/calls/instant. Use an existing agent (agent_id), a template (message), or a fully custom prompt/voice.",
    parameters: z.object({
        phone: z.string().describe("Destination phone number"),
        message: z.string().optional().describe("Notification / start message text"),
        agent_id: z.union([z.string(), z.number()]).optional().describe("Existing agent id (uses its voice + prompt)"),
        voice_provider: z.enum(["OPENAI", "ELEVENLABS", "MINIMAX", "QWEN", "EDGETTS"]).optional().describe("TTS provider"),
        voice: z.string().optional().describe("Voice id (OpenAI: alloy/sage; Edge: e.g. ms-MY-YasminNeural)"),
        system_prompt: z.string().optional().describe("AI system prompt for a fully custom call"),
        notification_voice_message: z.string().optional().describe("Spoken message for notification agent"),
        from_number: z.string().optional().describe("Caller ID / from number"),
        voice_clone_id: z.string().optional().describe("Qwen voice clone id (only with QWEN provider)"),
        noninteractive: z.boolean().optional().describe("One-way playback only"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/calls/instant", args);
        return toText(response.data);
    },
});

// --- CEMAS ---

mcp.addTool({
    name: "getCemasConfig",
    description: "Get the authenticated user's CEMAS config: namespace, destination phone(s), active flag, and Edge TTS voice/prosody preferences.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/cemas", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "saveCemasConfig",
    description: "Save the user's CEMAS destination phone(s), active flag, and Edge TTS voice + prosody (rate/pitch/volume as 0.1-10 / 0-2 / 0-1 sliders).",
    parameters: z.object({
        destination_phone_number: z.array(z.string()).describe("List of phone numbers to notify"),
        is_active: z.boolean().optional().describe("Whether CEMAS notifications are active"),
        edge_voice_preference: z.string().optional().describe("Edge TTS voice ShortName, e.g. ms-MY-YasminNeural"),
        edge_rate: z.number().optional().describe("0.1-10 (1.0 = normal)"),
        edge_pitch: z.number().optional().describe("0-2 (1.0 = normal)"),
        edge_volume: z.number().optional().describe("0-1 (1.0 = max)"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.put("/cemas/destination", args);
        return toText(response.data);
    },
});

// --- Edge TTS ---

mcp.addTool({
    name: "listEdgeVoices",
    description: "List Microsoft Edge TTS voices available for CEMAS / instant calls. Filter by language (en, ms, zh...), gender, or substring.",
    parameters: z.object({
        lang: z.string().optional().describe("Language filter (en, ms, zh, all)"),
        gender: z.enum(["Female", "Male"]).optional(),
        q: z.string().optional().describe("Substring match on voice name / ShortName"),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/tts/edge-voices", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "previewEdgeVoice",
    description: "Synthesize a short preview clip with an Edge TTS voice. Returns MP3 bytes (base64 in the response).",
    parameters: z.object({
        text: z.string().describe("Text to synthesize"),
        voice: z.string().describe("Edge voice ShortName, e.g. ms-MY-YasminNeural"),
        rate: z.string().optional().describe("e.g. +10% / -20%"),
        pitch: z.string().optional().describe("e.g. +20Hz / -10Hz"),
        volume: z.string().optional().describe("e.g. +15% / -10%"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/tts/edge-preview", args);
        return toText(response.data);
    },
});

// --- Voice Clones ---

mcp.addTool({
    name: "listVoiceClones",
    description: "List all voice clones owned by the authenticated user.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/voice-clones", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "createVoiceClone",
    description: "Upload training audio URLs and trigger voice cloning. Returns the clone record with training_status.",
    parameters: z.object({
        voice_clone_training_urls: z.array(z.string()).describe("List of audio URLs used for training"),
        transcript: z.string().optional().describe("Transcript of the training audio"),
        metadescription: z.string().optional().describe("Human-readable description of the clone"),
        provider: z.string().optional().describe("e.g. Qwen"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/voice-clones", args);
        return toText(response.data);
    },
});

// --- User Agents ---

mcp.addTool({
    name: "listAgents",
    description: "List AI agents for the authenticated user.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/agents", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "createAgent",
    description: "Create an AI agent. Required: name, voice, agent_start_message.",
    parameters: z.object({
        name: z.string().describe("Agent name"),
        voice: z.string().optional().describe("OpenAI voice (alloy, sage, ...)"),
        agent_start_message: z.string().optional().describe("First spoken line"),
        goal: z.string().optional().describe("System prompt / instructions"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/agents", args);
        return toText(response.data);
    },
});

mcp.addTool({
    name: "updateAgent",
    description: "Update fields on an existing AI agent.",
    parameters: z.object({
        id: z.union([z.string(), z.number()]).describe("Agent id"),
        name: z.string().optional(),
        voice: z.string().optional(),
        agent_start_message: z.string().optional(),
        goal: z.string().optional(),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const { id, ...data } = args;
        const response = await apiClient.patch(`/agents/${id}`, data);
        return toText(response.data);
    },
});

// --- Leads / Contacts ---

mcp.addTool({
    name: "listLeads",
    description: "List the authenticated user's contacts / leads.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/contacts", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "createLead",
    description: "Add a contact / lead. Extra columns go into extra_metadata_fields.",
    parameters: z.object({
        name: z.string().describe("Lead / contact name"),
        receipient_name: z.string().optional().describe("Recipient name"),
        phone: z.string().describe("Phone number"),
        receipient_info: z.string().optional().describe("Notes"),
        goal: z.string().optional().describe("Conversation goal"),
        tag: z.string().optional().describe("Group / tag"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/contacts", args);
        return toText(response.data);
    },
});

// --- Scheduled Calls ---

mcp.addTool({
    name: "listScheduledCalls",
    description: "List planned outbound reminder calls.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/scheduled-calls", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "createScheduledCall",
    description: "Schedule an outbound call. Set status LIVE to activate for the scheduler.",
    parameters: z.object({
        name: z.string().optional().describe("Human-readable name"),
        phone: z.string().describe("Destination phone"),
        datetime: z.string().describe("ISO datetime, e.g. 2026-08-15T10:00:00Z"),
        receipient_name: z.string().optional(),
        goal: z.string().optional().describe("Reminder message / goal"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/scheduled-calls", args);
        return toText(response.data);
    },
});

// --- Call Logs / Reports ---

mcp.addTool({
    name: "listCallLogs",
    description: "List past outbound call records.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/call-logs", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "getReports",
    description: "Get aggregate call reports / analytics.",
    parameters: z.object({
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/reports", { params: args });
        return toText(response.data);
    },
});

// --- Profile ---

mcp.addTool({
    name: "getProfile",
    description: "Fetch the authenticated user's profile (name, email, balance, preferences).",
    parameters: z.object({}),
    execute: async () => {
        const response = await apiClient.get("/profile");
        return toText(response.data);
    },
});

mcp.addTool({
    name: "updateProfile",
    description: "Update profile fields. max_talk_time_ms is the max call duration in milliseconds (90000 = 90s).",
    parameters: z.object({
        name: z.string().optional(),
        default_sip_number: z.string().optional(),
        max_talk_time_ms: z.number().optional(),
        profile_image_url: z.string().optional(),
    }),
    execute: async (args) => {
        const response = await apiClient.patch("/profile", args);
        return toText(response.data);
    },
});

// --- Webhooks ---

mcp.addTool({
    name: "listWebhookConfigurations",
    description: "List webhook configurations for an agent (on_call_start / on_call_end). Secrets are redacted.",
    parameters: z.object({
        agent_id: z.union([z.string(), z.number()]).describe("Agent id"),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.get("/webhooks/configurations", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "upsertWebhookConfiguration",
    description: "Create or update a webhook configuration for an agent + event.",
    parameters: z.object({
        agent_id: z.union([z.string(), z.number()]).describe("Agent id"),
        event_name: z.string().describe("e.g. on_call_start / on_call_end"),
        webhook_url: z.string().describe("HTTPS endpoint"),
        webhook_secret: z.string().optional(),
        is_enabled: z.boolean().optional().default(true),
        owner_email: z.string().optional().describe("Ignored for user API keys; required only with system API key"),
    }),
    execute: async (args) => {
        const response = await apiClient.post("/webhooks/configurations", args);
        return toText(response.data);
    },
});

// --- Account activation / auth (pre-auth: no x-api-key required) ---
// These endpoints create/validate/login before a user has an API key, so they
// use a bare axios client (no x-api-key header).
const authClient2 = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
});

mcp.addTool({
    name: "createNewUser",
    description: "Request an account-activation code by email. Does NOT create the account; emails the user an OTP + code ref (call validateNewUser to finish).",
    parameters: z.object({
        email: z.string().describe("Recipient email to activate"),
        name: z.string().optional().describe("Optional display name"),
        phone: z.string().optional(),
    }),
    execute: async (args) => {
        const response = await authClient2.post("/auth/create-new-user", args);
        return toText(response.data);
    },
});

mcp.addTool({
    name: "validateNewUser",
    description: "Validate the emailed OTP + code ref and fully create the account. Optionally set a password so the user can log in. Returns the new API key.",
    parameters: z.object({
        ref: z.string().describe("8-char code reference from the email"),
        otp: z.string().describe("6-digit OTP from the email"),
        password: z.string().optional().describe("Optional password (min 6 chars) so the user can log in"),
    }),
    execute: async (args) => {
        const response = await authClient2.get("/auth/validate-new-user", { params: args });
        return toText(response.data);
    },
});

mcp.addTool({
    name: "loginUser",
    description: "Sign in with email + password and get the app API key + session. Use logoutUser to sign out.",
    parameters: z.object({
        email: z.string().describe("Account email"),
        password: z.string().describe("Account password"),
    }),
    execute: async (args) => {
        const response = await authClient2.post("/auth/login-user", args);
        return toText(response.data);
    },
});

mcp.addTool({
    name: "logoutUser",
    description: "Sign out the current session (stateless). Clears the caller's stored key.",
    parameters: z.object({}),
    execute: async () => {
        const response = await authClient2.post("/auth/logout-user", {});
        return toText(response.data);
    },
});


    return mcp;
}
