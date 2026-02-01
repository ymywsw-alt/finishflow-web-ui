import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// ESM에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ public 폴더 정적 서빙 (절대 경로)
app.use(express.static(path.join(__dirname, "public")));

// ✅ / 와 /index.html 모두 강제 매핑
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ 브라우저가 호출하는 유일한 엔드포인트 (/make)
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
