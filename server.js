import express from "express";

const app = express();

// ✅ Render/브라우저 디버깅용: 모든 요청 로그
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[web-ui] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

const ENGINE_URL = (process.env.ENGINE_URL || "").replace(/\/$/, "");
console.log(`[web-ui] ENGINE_URL=${ENGINE_URL || "(missing)"}`);

app.post("/make", async (req, res) => {
  if (!ENGINE_URL) {
    console.error("[web-ui] ENGINE_URL is missing");
    return res.status(500).json({ ok: false, error: "ENGINE_URL is not set" });
  }

  console.log("[web-ui] /make payload keys:", Object.keys(req.body || {}));

  // ✅ 타임아웃 (엔진이 느릴 수 있음)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s

  try {
    const upstreamUrl = `${ENGINE_URL}/make`;
    console.log("[web-ui] proxy ->", upstreamUrl);

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    console.log("[web-ui] upstream status:", upstream.status);

    res.status(upstream.status);
    res.setHeader("content-type", contentType);
    return res.send(text);
  } catch (e) {
    const msg = e?.name === "AbortError" ? "UPSTREAM_TIMEOUT" : String(e);
    console.error("[web-ui] proxy /make error:", msg);
    return res.status(502).json({ ok: false, error: "proxy_failed", detail: msg });
  } finally {
    clearTimeout(timeout);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[web-ui] listening on ${PORT}`);
});
