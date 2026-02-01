import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Config =====
const PORT = process.env.PORT || 10000;
const FINISHFLOW_API_BASE =
  process.env.FINISHFLOW_API_BASE || "https://finishflow-live-1.onrender.com";

// ===== Middleware =====
app.use(express.json({ limit: "2mb" }));

// 정적 UI
app.use(express.static(path.join(__dirname, "public")));

// 루트는 index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// health
app.get("/health", (req, res) => {
  res.json({ ok: true, api: FINISHFLOW_API_BASE });
});

// /make 프록시 (항상 JSON으로 보내고, 응답은 그대로 반환)
app.post("/make", async (req, res) => {
  try {
    const upstream = await fetch(`${FINISHFLOW_API_BASE}/make`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text(); // 무조건 text로 받고 그대로 돌려준다

    res.status(upstream.status);
    if (contentType) res.setHeader("content-type", contentType);
    return res.send(text);
  } catch (err) {
    console.error("PROXY /make failed:", err);
    return res.status(502).json({ ok: false, error: "proxy_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`FinishFlow Web UI running on ${PORT}`);
  console.log(`FINISHFLOW_API_BASE=${FINISHFLOW_API_BASE}`);
});
