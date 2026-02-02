import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ENGINE_URL = process.env.ENGINE_URL;

if (!ENGINE_URL) {
  console.error("❌ ENGINE_URL is not set");
}

/**
 * Static UI
 */
app.use(express.static("public"));

/**
 * Health check (proxy)
 */
app.get("/health", async (req, res) => {
  try {
    if (!ENGINE_URL) {
      return res.status(500).json({ ok: false, error: "ENGINE_URL is not set" });
    }
    const r = await fetch(`${ENGINE_URL}/health`);
    const j = await r.json();
    return res.json(j);
  } catch {
    return res.status(500).json({ ok: false, error: "ENGINE_UNREACHABLE" });
  }
});

/**
 * Unified execute handler
 * - UI가 /make 또는 /execute를 호출해도 동일 처리
 * - extraJson.prompt 우선
 * - 없으면 topic → prompt 자동 매핑
 */
async function handleMakeOrExecute(req, res) {
  try {
    if (!ENGINE_URL) {
      return res.status(500).json({
        ok: false,
        error: "ENGINE_URL is not set",
      });
    }

    const { topic, country, extraJson } = req.body || {};

    // extraJson 파싱
    let extra = {};
    if (extraJson && String(extraJson).trim()) {
      try {
        extra = JSON.parse(extraJson);
      } catch {
        return res.status(400).json({ ok: false, error: "INVALID_JSON" });
      }
    }

    // prompt 자동 결정
    const finalPrompt =
      typeof extra.prompt === "string" && extra.prompt.trim()
        ? extra.prompt.trim()
        : typeof topic === "string"
        ? topic.trim()
        : "";

    if (!finalPrompt) {
      return res.status(400).json({ ok: false, error: "EMPTY_TOPIC" });
    }

    // live 서버로 전달
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
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "UI_PROXY_FAILED",
      message: String(e?.message || e),
    });
  }
}

/**
 * 가장 안정적인 구조:
 * /make, /execute 모두 같은 핸들러 사용
 */
app.post("/make", handleMakeOrExecute);
app.post("/execute", handleMakeOrExecute);

const port = process.env.PORT || 10000;
app.listen(port, () =>
  console.log(`[finishflow-web-ui] listening on ${port}`)
);
