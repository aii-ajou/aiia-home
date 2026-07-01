/**
 * revalidate-flow.mjs — 콘텐츠 변경 시 웹 앱의 /api/revalidate 를 호출하는 Directus Flow 생성.
 * 이걸로 편집자가 저장/게시하면 SSR 캐시가 즉시 무효화되어 사이트에 바로 반영된다.
 *
 * 실행:  node --env-file=.env seed/revalidate-flow.mjs   (Directus 실행 중)
 * 대상 URL 은 배포 환경마다 다르므로 env 로 지정한다(로컬 기본 http://localhost:4321).
 *   REVALIDATE_URL=<웹앱>/api/revalidate,  REVALIDATE_SECRET=<시크릿>
 * 멱등: 같은 이름의 Flow 가 있으면 건너뛴다.
 */
const URL = process.env.PUBLIC_URL || "http://localhost:8055";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const TARGET = process.env.REVALIDATE_URL || "http://localhost:4321/api/revalidate";
const SECRET = process.env.REVALIDATE_SECRET || "local-dev-secret";
const FLOW_NAME = "AIIA revalidate";

const CONTENT_COLLECTIONS = [
  "site_settings", "hero", "about", "inquiry", "contact", "footer",
  "nav_items", "stats", "centers", "members", "news",
];

let TOKEN;
async function login() {
  const r = await fetch(`${URL}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login 실패 (${r.status}): ${await r.text()}`);
  TOKEN = (await r.json()).data.access_token;
}
async function api(path, method = "GET", body) {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${t}`);
  return j?.data;
}

await login();
const flows = await api("/flows?fields=id,name");
if (flows.some((f) => f.name === FLOW_NAME)) {
  console.log(`· skip: Flow "${FLOW_NAME}" 이미 존재`);
} else {
  const flow = await api("/flows", "POST", {
    name: FLOW_NAME,
    icon: "sync",
    status: "active",
    trigger: "event",
    accountability: "all",
    options: {
      type: "action",
      scope: ["items.create", "items.update", "items.delete"],
      collections: CONTENT_COLLECTIONS,
    },
  });
  const op = await api("/operations", "POST", {
    flow: flow.id,
    name: "revalidate webhook",
    key: "revalidate",
    type: "request",
    position_x: 19,
    position_y: 1,
    options: {
      url: TARGET,
      method: "POST",
      headers: [{ header: "x-revalidate-secret", value: SECRET }],
    },
  });
  await api(`/flows/${flow.id}`, "PATCH", { operation: op.id });
  console.log(`✓ Flow "${FLOW_NAME}" → POST ${TARGET}`);
}
