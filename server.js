import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Config =====
const PORT = process.env.PORT || 10000;

// 엔진(Worker/API) 베이스 URL (예: https://finishflow-live-1.onrender.com)
const FINISHFLOW_API_BASE =
  process.env.FINISHFLOW_API_BASE || "https://finishflow-live-1.onrender.com";

// ===== Middleware =====
app.use(express.json({ limit: "2mb" }));

// public 디렉터리 정석 서빙
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// ===== Health =====
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// ===== UI Route =====
// / 또는 /index.html로 들어오면 public/index.html 서빙
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ===== Proxy: /make -> {FINISHFLOW_API_BASE}/make =====
// ✅ 브라우저는 무조건 같은 오리진(/make)만 호출 -> CORS 제거
app.post("/make", async (req, res) => {
  try {
    const upstreamUrl = `${FINISHFLOW_API_BASE.replace(/\/$/, "")}/make`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const contentType = upstream.headers.get("content-type") || "text/plain";
    res.status(upstream.status);
    res.setHeader("content-type", contentType);

    // upstream이 JSON이든 텍스트든 그대로 전달
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    return res
      .status(502)
      .send(`proxy error: failed to call engine /make\n${String(err)}`);
  }
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`FinishFlow Web UI running on ${PORT}`);
  console.log(`FINISHFLOW_API_BASE=${FINISHFLOW_API_BASE}`);
});
