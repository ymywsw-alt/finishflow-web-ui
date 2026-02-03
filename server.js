import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));

/**
 * ✅ 엔진 베이스 URL
 * - Render 환경변수 FINISHFLOW_API_BASE 로 주입 가능
 * - 기본값은 현재 기준선 엔진으로 고정
 */
const API_BASE = (process.env.FINISHFLOW_API_BASE || "https://finishflow-live-2.onrender.com").replace(/\/+$/, "");

/**
 * 간단 health
 */
app.get("/health", (req, res) => res.json({ ok: true }));

/**
 * 사용자용 1줄 에러 메시지 (운영 편의)
 */
function userErrorMessage(err) {
  const code = err?.errorCode || err?.code || err?.error || "";
  if (!code) return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  if (String(code).startsWith("E-NO-OPENAI-KEY")) return "서버 설정 오류(키 누락). 관리자에게 문의하세요.";
  if (String(code).startsWith("E-OPENAI")) return "AI 호출 실패. 잠시 후 다시 시도해주세요.";
  if (String(code).startsWith("E-PARSE")) return "결과 처리 오류. 잠시 후 다시 시도해주세요.";
  return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

/**
 * HTML escape (XSS 방지)
 */
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 메인 UI 페이지
 * - 주제 1줄 + 국가 선택
 * - 결과 카드 출력
 */
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>FinishFlow Web UI</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.35; }
    .wrap { max-width: 980px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    select, textarea, button { font-size: 14px; }
    textarea { width: 100%; max-width: 980px; padding: 10px; }
    button { padding: 10px 14px; cursor: pointer; }
    .btn { background: #111; color: #fff; border: 0; border-radius: 10px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .card { border: 1px solid #e5e5e5; border-radius: 14px; padding: 14px; margin-top: 14px; }
    .card h2 { font-size: 16px; margin: 0 0 8px; }
    .muted { color: #666; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 860px) { .grid { grid-template-columns: 1fr 1fr; } }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; border: 1px solid #ddd; }
    .pill.rec { border-color: #111; font-weight: 700; }
    .copy { margin-left: 8px; font-size: 12px; border: 1px solid #ddd; border-radius: 10px; padding: 4px 8px; background: #fff; cursor: pointer; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
    .error { color: #b00020; font-weight: 700; }
    .ok { color: #0a7a2f; font-weight: 700; }
    .footer { margin-top: 20px; color: #777; font-size: 12px; }
    .small { font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>FinishFlow Web UI</h1>
    <div class="meta">
      엔진: <span class="pill">${esc(API_BASE)}</span>
      <span class="small">/execute</span>
    </div>

    <div class="card">
      <h2>주제 입력</h2>
      <div class="row">
        <label>국가/언어</label>
        <select id="country">
          <option value="KR" selected>KR (한국어)</option>
          <option value="JP">JP (일본어)</option>
          <option value="US">US (영어)</option>
        </select>
      </div>
      <div style="margin-top:10px;">
        <textarea id="topic" rows="4" placeholder="예: 오늘 환율 급등, 시니어 생활비 영향">오늘 환율 급등, 시니어 생활비 영향</textarea>
      </div>
      <div class="row" style="margin-top:10px;">
        <button id="run" class="btn">한방 제작 실행</button>
        <span id="status" class="muted"></span>
      </div>
      <div id="msg" style="margin-top:10px;"></div>
    </div>

    <div id="output"></div>

    <div class="footer">
      원칙: 출력은 <b>롱폼1 + 숏폼3 + 썸네일3</b> 고정. 오류는 사용자용 1줄로 표시.
    </div>
  </div>

<script>
  const API_BASE = ${JSON.stringify(API_BASE)};
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function oneLineError(err) {
    const code = err && (err.errorCode || err.code || err.error);
    if (!code) return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    const c = String(code);
    if (c.startsWith("E-NO-OPENAI-KEY")) return "서버 설정 오류(키 누락). 관리자에게 문의하세요.";
    if (c.startsWith("E-OPENAI")) return "AI 호출 실패. 잠시 후 다시 시도해주세요.";
    if (c.startsWith("E-PARSE")) return "결과 처리 오류. 잠시 후 다시 시도해주세요.";
    return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      $("status").textContent = "복사 완료";
      setTimeout(() => $("status").textContent = "", 900);
    } catch {
      alert("복사 실패: 브라우저 권한을 확인하세요.");
    }
  }

  function renderResult(result) {
    if (!result) return "";

    const longform = result.longform || { title: "", script: "" };
    const shortforms = Array.isArray(result.shortforms) ? result.shortforms : [];
    const thumbnails = Array.isArray(result.thumbnails) ? result.thumbnails : [];

    const sfHtml = shortforms.map((s, idx) => {
      const title = esc(s.title || "");
      const script = esc(s.script || "");
      return \`
        <div class="card">
          <h2>숏폼 \${idx + 1}</h2>
          <div class="muted">\${title}</div>
          <div style="margin-top:8px;">
            <pre>\${script}</pre>
          </div>
          <div style="margin-top:10px;">
            <button class="copy" data-copy="\${encodeURIComponent(s.title || "")}">제목 복사</button>
            <button class="copy" data-copy="\${encodeURIComponent(s.script || "")}">스크립트 복사</button>
          </div>
        </div>
      \`;
    }).join("");

    const thHtml = thumbnails.map((t, idx) => {
      const rec = idx === 0 ? 'rec' : '';
      const label = idx === 0 ? '추천' : '대안';
      const text = esc(t.text || "");
      return \`
        <div class="card">
          <h2>썸네일 \${idx + 1} <span class="pill \${rec}">\${label}</span></h2>
          <pre>\${text}</pre>
          <div style="margin-top:10px;">
            <button class="copy" data-copy="\${encodeURIComponent(t.text || "")}">문구 복사</button>
          </div>
        </div>
      \`;
    }).join("");

    return \`
      <div class="card">
        <h2>결과</h2>
        <div class="ok">엔진 응답 수신 완료</div>
        <div class="muted">롱폼 1 + 숏폼 3 + 썸네일 3 고정 출력</div>
      </div>

      <div class="card">
        <h2>롱폼</h2>
        <div class="muted">\${esc(longform.title || "")}</div>
        <div style="margin-top:8px;">
          <pre>\${esc(longform.script || "")}</pre>
        </div>
        <div style="margin-top:10px;">
          <button class="copy" data-copy="\${encodeURIComponent(longform.title || "")}">제목 복사</button>
          <button class="copy" data-copy="\${encodeURIComponent(longform.script || "")}">스크립트 복사</button>
        </div>
      </div>

      <div class="grid">
        \${sfHtml}
      </div>

      <div class="grid">
        \${thHtml}
      </div>
    \`;
  }

  $("run").onclick = async () => {
    const topic = $("topic").value.trim();
    const country = $("country").value;
    $("msg").innerHTML = "";
    $("output").innerHTML = "";

    if (!topic) {
      $("msg").innerHTML = '<div class="error">주제를 입력하세요.</div>';
      return;
    }

    $("run").disabled = true;
    $("status").textContent = "실행 중...";

    try {
      const r = await fetch("/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, country }),
      });

      const data = await r.json();

      if (!data.ok) {
        $("msg").innerHTML = '<div class="error">' + esc(oneLineError(data)) + "</div>";
        return;
      }

      $("msg").innerHTML = '<div class="ok">' + esc(data.text || "완료") + "</div>";
      $("output").innerHTML = renderResult(data.result);

      document.querySelectorAll("button.copy").forEach((btn) => {
        btn.addEventListener("click", () => {
          const v = decodeURIComponent(btn.getAttribute("data-copy") || "");
          copyText(v);
        });
      });

    } catch (e) {
      $("msg").innerHTML = '<div class="error">네트워크 오류. 잠시 후 다시 시도해주세요.</div>';
    } finally {
      $("run").disabled = false;
      $("status").textContent = "";
    }
  };
</script>
</body>
</html>`);
});

/**
 * ✅ web-ui 실행 엔드포인트
 * - topic/country 입력 → 엔진 /execute 호출
 * - 엔진 응답을 그대로 UI에 전달 (A안 기준)
 */
app.post("/make", async (req, res) => {
  try {
    if (typeof fetch !== "function") {
      return res.status(500).json({
        ok: false,
        errorCode: "E-FETCH-NOT-FOUND",
        text: "작업 실패 – 잠시 후 다시 시도해주세요.",
        result: null,
      });
    }

    const { topic, country } = req.body || {};
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({
        ok: false,
        errorCode: "E-INVALID-TOPIC",
        text: "주제를 입력하세요.",
        result: null,
      });
    }

    const engineUrl = API_BASE + "/execute";

    const r = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: topic,
        country: (country || "KR").toUpperCase(),
      }),
    });

    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      errorCode: "E-WEBUI-SERVER",
      text: "작업 실패 – 잠시 후 다시 시도해주세요.",
      result: null,
    });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`[finishflow-web-ui] listening on ${port}`));
