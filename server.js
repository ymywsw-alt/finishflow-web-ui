import express from "express";

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
    if (!ENGINE_URL) {
      return res.status(500).json({ ok: false, error: "ENGINE_URL is not set" });
    }
    const r = await fetch(`${ENGINE_URL}/health`);
    const j = await r.json();
    return res.json(j);
  } catch (e) {
    return res.status(500).json({ ok: false, error: "ENGINE_UNREACHABLE" });
  }
});

/**
 * Execute handler (UI → live)
 * - extraJson 안에 prompt가 있으면 그걸 사용
 * - 없으면 topic(주제)을 prompt로 자동 매핑
 * - UI가 /make 를 치든 /execute 를 치든 동일 처리 (안정)
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

    // 1) JSON 파싱
    let extra = {};
    if (extraJson && String(extraJson).trim()) {
      try {
        extra = JSON.parse(extraJson);
      } catch {
        return res.status(400).json({ ok: false, error: "INVALID_JSON" });
      }
    }

    // 2) prompt 자동 매핑
    const finalPrompt =
      typeof extra.prompt === "string" && extra.prompt.trim()
        ? extra.prompt.trim()
        : typeof topic === "string"
        ? topic.trim()
        : "";

    if (!finalPrompt) {
      return res.status(400).json({ ok: false, error: "EMPTY_TOPIC" });
    }

    // 3) live로 전달 (live는 /execute, /api/execute 둘 다 지원하지만 /execute로 고정)
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
 * ✅ 가장 안정적인 구조:
 * UI가 어떤 경로(/make or /execute)를 때려도 동일 핸들러로 처리
 */
app.post("/make", handleMakeOrExecute);
app.post("/execute", handleMakeOrExecute);

const port = process.env.PORT || 10000;
app.listen(port, () =>
  console.log(`[finishflow-web-ui] listening on ${port}`)
);
