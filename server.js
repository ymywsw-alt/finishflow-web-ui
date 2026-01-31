import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ✅ 기존 FinishFlow API 서버 URL (네가 확인한 /health, /make, /download가 있는 곳)
const API_BASE =
  (process.env.FINISHFLOW_API_BASE || "https://finishflow-live-1.onrender.com").replace(/\/$/, "");

app.get("/", (_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FinishFlow UI</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
.box{max-width:880px;margin:0 auto}
h1{margin:0 0 8px} .muted{color:#666;margin:0 0 18px}
label{display:block;margin:12px 0 6px;font-weight:700}
input,textarea,select{width:100%;padding:10px;border:1px solid #ddd;border-radius:12px;font-size:14px}
textarea{min-height:120px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
button{padding:12px 14px;border:0;border-radius:12px;font-weight:800;cursor:pointer}
.btn{background:#111;color:#fff} .btn2{background:#eee;color:#111}
.status{margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;background:#fafafa;white-space:pre-wrap}
</style></head>
<body><div class="box">
<h1>FinishFlow (버튼 UI 복구)</h1>
<div class="muted">API 서버: <b id="apibase"></b></div>

<div class="row">
  <div>
    <label>국가</label>
    <select id="country"><option value="KR">한국(KR)</option><option value="JP">일본(JP)</option></select>
  </div>
  <div>
    <label>주제(간단히)</label>
    <input id="topic" placeholder="예: 무릎 통증 없이 걷는 법"/>
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
const API_BASE = ${JSON.stringify(API_BASE)};
document.getElementById("apibase").textContent = API_BASE;

const out = (m)=>document.getElementById("out").textContent=m;

document.getElementById("health").onclick = async ()=>{
  out("health 확인 중...");
  try{
    const r=await fetch(API_BASE+"/health");
    out("HTTP "+r.status+"\\n"+await r.text());
  }catch(e){ out("health 실패: "+e.message); }
};

document.getElementById("run").onclick = async ()=>{
  out("제작 요청 중... (POST /make)");
  const country=document.getElementById("country").value;
  const topic=document.getElementById("topic").value.trim();
  let extra={};
  try{ extra=JSON.parse(document.getElementById("payload").value||"{}"); }
  catch(e){ out("JSON 파싱 실패: "+e.message); return; }

  const body={ country, topic, ...extra };

  try{
    const r=await fetch(API_BASE+"/make",{
      method:"POST",
      headers:{ "content-type":"application/json" },
      body:JSON.stringify(body)
    });
    const text=await r.text();
    if(!r.ok){ out("POST /make 실패 (HTTP "+r.status+")\\n"+text); return; }

    let token=null;
    try{
      const j=JSON.parse(text);
      token=j.token||j.downloadToken||j.id||null;
      if(!token && typeof j==="string") token=j;
    }catch{}

    if(token){
      const url=API_BASE+"/download?token="+encodeURIComponent(token);
      out("성공! 다운로드 링크:\\n"+url);
      window.open(url,"_blank");
    }else{
      out("성공! (token 자동 추출 실패)\\n응답:\\n"+text);
    }
  }catch(e){ out("POST /make 실패: "+e.message); }
};
</script>
</body></html>`);
});

app.get("/health", (_req, res) => res.json({ ok: true, ui: true }));

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => console.log("Web UI listening on", port));
