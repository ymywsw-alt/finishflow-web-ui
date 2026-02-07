import express from "express";

const app = express();

// JSON 바디 파싱
app.use(express.json({ limit: "10mb" }));

// 정적 파일(public/index.html 등)
app.use(express.static("public"));

// 헬스체크 (선택이지만 강력 추천)
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// 엔진 주소
const ENGINE_URL = process.env.ENGINE_URL;
if (!ENGINE_URL) {
  console.error("ENGINE_URL is not set");
}

// ✅ 핵심: /make 프록시 (web-ui -> live-3)
app.post("/make", async (req, res) => {
  try {
    if (!ENGINE_URL) {
      return res.status(500).json({ ok: false, error: "ENGINE_URL is not set" });
    }

    const upstream = await fetch(`${ENGINE_URL}/make`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader("content-type", contentType);
    return res.send(text);
  } catch (e) {
    console.error("proxy /make error:", e);
    return res.status(500).json({ ok: false, error: "proxy /make failed" });
  }
});

// Render 포트
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`finishflow-web-ui listening on ${PORT}`);
  console.log(`ENGINE_URL=${ENGINE_URL || "(missing)"}`);
});
