/**
 * finishflow-web-ui/server.js (FULL REPLACE - ESM)
 * - Serve static UI from /public
 * - Proxy:
 *   GET  /health  -> ENGINE_URL/health
 *   POST /make    -> ENGINE_URL/execute
 *   POST /execute -> ENGINE_URL/execute
 *
 * ENV (any one of these is accepted):
 *   ENGINE_URL = https://finishflow-live-1.onrender.com
 *   ENGINEURL  = https://finishflow-live-1.onrender.com
 *   FINISHFLOW_ENGINE_URL = https://finishflow-live-1.onrender.com
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = Number(process.env.PORT || 10000);

// ✅ Accept multiple env keys to eliminate mismatch errors
const ENGINE_URL_RAW =
  process.env.ENGINE_URL ||
  process.env.ENGINEURL ||
  process.env.FINISHFLOW_ENGINE_URL ||
  "";

const ENGINE_URL = ENGINE_URL_RAW.toString().trim().replace(/\/$/, "");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) static files
app.use(express.static(path.join(__dirname, "public")));

// 2) raw body (empty body / invalid JSON safe)
app.use(express.text({ type: "*/*", limit: "10mb" }));

function safeParseJSON(raw) {
  const t = (raw ?? "").toString();
  if (!t.trim()) return null;
  try {
    return JSON.parse(t);
  } catch {
    return "__INVALID_JSON__";
  }
}

function requireEngine(res) {
  if (!ENGINE_URL) {
    res.status(500).json({
      error: "ENGINE_URL is not set",
      hint: "Set Render env ENGINE_URL=https://finishflow-live-1.onrender.com (no trailing slash)",
      seenKeys: {
        ENGINE_URL: Boolean(process.env.ENGINE_URL),
        ENGINEURL: Boolean(process.env.ENGINEURL),
        FINISHFLOW_ENGINE_URL: Boolean(process.env.FINISHFLOW_ENGINE_URL),
      },
    });
    return false;
  }
  return true;
}

// GET /health → engine /health
app.get("/health", async (req, res) => {
  if (!requireEngine(res)) return;

  try {
    const r = await fetch(`${ENGINE_URL}/health`, { method: "GET" });
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    res.status(502).json({
      error: "Failed to reach engine /health",
      message: String(e?.message || e),
    });
  }
});

// POST /make, /execute → engine /execute
async function proxyExecute(req, res) {
  if (!requireEngine(res)) return;

  const parsed = safeParseJSON(req.body);

  if (parsed === "__INVALID_JSON__") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const payload = parsed && typeof parsed === "object" ? parsed : {};

  try {
    const r = await fetch(`${ENGINE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    res.status(502).json({
      error: "Failed to reach engine /execute",
      message: String(e?.message || e),
    });
  }
}

app.post("/make", proxyExecute);
app.post("/execute", proxyExecute);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`finishflow-web-ui listening on ${PORT}`);
  console.log(`ENGINE_URL=${ENGINE_URL || "(not set)"}`);
});
