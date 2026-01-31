import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

const API_BASE =
  (process.env.FINISHFLOW_API_BASE || "https://finishflow-live-1.onrender.com")
    .replace(/\/$/, "");

/* ======================
   UI 페이지
====================== */
app.get("/", (_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FinishFlow UI</title>
</head>
<body>
<h2>FinishFlow (버튼 UI 복구)</h2>

국가:
<select id="country">
  <option value="KR">한국(KR)</option>
  <option value="JP">일본(JP)</option>
</select><br/><br/>

주제:
<input id="topic" style="width:300px"/><br/><br/>

<button onclick="run()">한방 제작 실행</button>
<pre id="out">대기 중…</pre>

<script>
async function run(){
  document.getElementById("out").textContent = "요청 중...";
  try{
    const r = await fetch("/make", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify({
        country: document.getElementById("country").value,
        topic: document.getElementById("topic").value
      })
    });
    const t = await r.text();
    document.getElementById("out").textContent = t;
  }catch(e){
    document.getElementById("out").textContent = e.message;
  }
}
</script>
</body>
</html>`);
});

/* ======================
   🔥 핵심: 프록시 API
====================== */
app.post("/make", async (req, res) => {
  try {
    const r = await fetch(API_BASE + "/make", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).send("proxy error: " + e.message);
  }
});

app.get("/health", async (_req, res) => {
  try {
    const r = await fetch(API_BASE + "/health");
    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(500).send(e.message);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () =>
  console.log("FinishFlow Web UI (proxy) listening on", port)
);
