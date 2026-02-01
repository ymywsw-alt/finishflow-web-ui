async function health() {
  const out = document.getElementById("result");
  out.textContent = "요청 중: GET /health ...";

  try {
    const r = await fetch("/health", { method: "GET" });
    const text = await r.text();
    out.textContent = `STATUS ${r.status}\n\n${text}`;
  } catch (e) {
    out.textContent = `ERROR: Failed to fetch /health\n${String(e)}`;
  }
}

async function run() {
  const out = document.getElementById("result");

  const country = document.getElementById("country").value;
  const topic = document.getElementById("topic").value.trim();
  const paramsText = document.getElementById("params").value.trim();

  if (!topic) {
    out.textContent = "주제를 입력해.";
    return;
  }

  let extra = {};
  try {
    extra = paramsText ? JSON.parse(paramsText) : {};
  } catch (e) {
    out.textContent = "추가 파라미터(JSON) 형식이 깨졌어. {} 로 두거나 JSON을 올바르게 입력해.";
    return;
  }

  // ✅ UI는 엔진을 직접 호출하지 않는다. 무조건 같은 오리진의 /make만 호출한다.
  const payload = { country, topic, ...extra };

  out.textContent = "POST /make 실행 중...";

  try {
    const r = await fetch("/make", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    out.textContent = `STATUS ${r.status}\n\n${text}`;
  } catch (e) {
    out.textContent = `ERROR: Failed to fetch /make\n${String(e)}`;
  }
}
