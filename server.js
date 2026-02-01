import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 정적 파일 서빙: /public 아래를 사이트 루트로
app.use(express.static(path.join(__dirname, "public")));

// ✅ / 와 /index.html 강제 매핑 (Cannot GET 방지)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ 브라우저는 오직 /make만 호출
app.post("/make", async (req, res) => {
  try {
    const r = await fetch("https://finishflow-live-1.onrender.com/make", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ENGINE_CALL_FAILED" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("FinishFlow Web UI running on", PORT));
