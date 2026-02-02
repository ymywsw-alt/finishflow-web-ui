import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ENGINE_URL = process.env.ENGINE_URL;

if (!ENGINE_URL) {
  console.error("❌ ENGINE_URL is not set");
}

/**
 * UI static
 */
app.use(express.static("public"));

/**
 * Health (proxy)
 */
app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${ENGINE_URL}/health`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ ok: false, error: "ENGINE_UNREACHABLE" });
  }
});

/**
 * Execute (UI → live)
 */
app.post("/execute", async (req, res) => {
  try {
    if (!ENGINE_URL) {
      return res.status(500).json({
        ok: false,
        error: "ENGINE_URL is not set",
      });
    }

    const { topic, country, extraJson } = req.body || {};

    // 1️⃣ JSON 파싱
    let extra = {};
    if (extraJson) {
      try {
        extra = JSON.parse(extraJson);
      } catch {
        return res.status(400).json({
          ok: false,
          error: "INVALID_JSON",
        });
      }
    }

    // 2️⃣ prompt 자동 매핑
    const finalPrompt =
      typeof extra.prompt === "string" && extra.prompt.trim()
        ? extra.prompt.trim()
        : typeof topic === "string"
        ? topic.trim()
        : "";

    if (!finalPrompt) {
      return res.status(400).json({
        ok: false,
        error: "EMPTY_TOPIC",
      });
    }

    // 3️⃣ live로 전달
    const r = await fetch(`${ENGINE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...extra,
        prompt: finalPrompt,
        mode: extra.mode || country || "default",
      }),
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "UI_EXECUTE_FAILED",
      message: String(e?.message || e),
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`[finishflow-web-ui] listening on ${port}`)
);
