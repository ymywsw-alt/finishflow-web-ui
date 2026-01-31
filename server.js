import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

// ✅ 기존 FinishFlow API 서버 (절대 브라우저가 직접 호출하면 안 됨)
const API_BASE =
  (process.env.FINISHFLOW_API_BASE || "https://finishflow-live-1.onrender.com")
    .replace(/\/$/, "");

/* =========================
   UI (버튼 화면)
   - 브라우저는 API_BASE를 절대 직접 호출하지 않는다.
   - 브라우저는 같은 도메인(/health, /make)만 호출한다.
========================= */
app.get("/", (_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FinishFlow (버튼 UI 복구)</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
  .box{max-width:920px;margin:0 auto}
  h1{margin:0 0 8px}
  .muted{color:#666;margin:0 0 18px}
  label{display:block;margin:12px 0 6px;font-weight:800}
  input,textarea,select{width:100%;padding:10px;border:1px solid #ddd;border-radius:12px;font-size:14px}
  textarea{min-height:140px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  button{padding:12px 14px;border:0;border-radius:12px;font-weight:900;cursor:pointer}
  .btn{background:#111;color:#fff}
  .btn2{background:#eee;color:#111}
  .status{margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;background:#fafafa;white-space:pre-wrap}
</style>
</head>
<body>
<div class="box">
  <h1>FinishFlow (버튼 UI 복구)</h1>
  <div class="muted">
    API 서버(서버 내부에서만 사용): <b>${API_BASE}</b><br/>
    브라우저는 이 주소를 직접 호출하지 않고, 이 UI 서버가 대신 호출합니다(프록시).
  </div>

  <div class="row">
    <div>
      <label>국가</label>
      <select id="country">
        <option value="KR">한국(KR)</option>
        <option value="JP">일본(JP)</option>
      </select>
    </div>
    <div>
      <label>주제(간단히)</label>
      <input id="topic" placeholder="예: 50대 테니스 운동 적합한가?" />
    </div>
  </div>

  <label>추가 파라미터(JSON) — 모르겠으면 {} 그대로</label>
  <textarea id="payload">{}</textarea>

  <div style="display:flex;gap:10px;margin-top:14px">
    <button class="btn" id="run">한방 제작 실행</button>
    <button class="btn2" id="health">/health 확인</button>
  </div>

  <div class="status" id="out">대기 중…</div>
</div>

<script>
const out = (m)=>document.getElementById("out").textContent=m;

document.getElementById("health").onclick = async ()=>{
  out("health 확인 중...");
  try{
    const r = await fetch("/health"); // ✅ same-origin (프록시)
    out("HTTP "+r.status+"\\n"+await r.text());
  }catch(e){
    out("health 실패: "+e.message);
  }
};

document.getElementById("run").onclick = async ()=>{
  out("제작 요청 중... (POST /make)");
  const country = document.getElementById("country").value;
  const topic = document.getElementById("topic").value.trim();

  let extra = {};
  try{
    extra = JSON.parse(document.getElementById("payload").value || "{}");
  }catch(e){
    out("JSON 파싱 실패: "+e.message);
    return;
  }

  const body = { country, topic, ...extra };

  try{
    const r = await fetch("/make", { // ✅ same-origin (프록시)
      method:"POST",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(body)
    });
    const text = await r.text();

    // token 자동 추출 시도
    let token = null;
    try{
      const j = JSON.parse(text);
      token = j.token || j.downloadToken || j.id || null;
      if(!token && typeof j === "string") token = j;
    }catch{}

    if(!r.ok){
      out("POST /make 실패 (HTTP "+r.status+")\\n"+text);
      return;
    }

    if(token){
      // 다운로드는 API 쪽을 직접 열어도 되지만(새 창), CORS와는 무관
      const url = "${API_BASE}/download?token=" + encodeURIComponent(token);
      out("성공! 다운로드 링크:\\n"+url);
      window.open(url, "_blank");
    }else{
      out("성공! (token 자동 추출 실패)\\n응답:\\n"+text);
    }
  }catch(e){
    out("POST /make 실패: "+e.message);
  }
};
</script>
</body>
</html>`);
});

/* =========================
   프록시 엔드포인트
   - 브라우저는 여기(/health, /make)만 호출한다.
   - 이 서버가 API_BASE로 서버-서버 호출한다. (CORS 무관)
========================= */
app.get("/health", async (_req, res) => {
  try {
    const r = await fetch(API_BASE + "/health");
    const t = await r.text();
    res.status(r.status).send(t);
  } catch (e) {
    res.status(500).send("proxy health error: " + e.message);
  }
});

app.post("/make", async (req, res) => {
  try {
    const r = await fetch(API_BASE + "/make", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const t = await r.text();
    res.status(r.status).send(t);
  } catch (e) {
    res.status(500).send("proxy make error: " + e.message);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log("FinishFlow Web UI (proxy) listening on", port);
});
