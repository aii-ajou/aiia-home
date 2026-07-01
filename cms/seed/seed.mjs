/**
 * seed.mjs — 권한 + 역할/유저 + placeholder 콘텐츠를 멱등적으로 주입한다.
 *
 * 실행:  node --env-file=.env seed/seed.mjs   (cms/ 에서, Directus 실행 중)
 *
 * 하는 일:
 *  1) Public(익명) 읽기 권한: 콘텐츠(게시본) + directus_files → 공개 사이트가 토큰 없이 렌더됨.
 *  2) Editor 역할 + 정책 + 콘텐츠 CRUD/파일 업로드 권한, 더미 편집자 계정(editor@example.com).
 *  3) 싱글톤/컬렉션 placeholder 콘텐츠(현재 더미와 동일한 내용, status=published).
 *
 * 색상은 accent 키만 저장(자유 색상값 아님). 키→CSS 토큰 매핑: src/lib/directus/accent.ts.
 */

const URL = process.env.PUBLIC_URL || "http://localhost:8055";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const EDITOR_EMAIL = "editor@example.com";
const EDITOR_PASSWORD = "editor1234";

// 게시본만 공개할 컬렉션(다행 컬렉션은 status 필터, 싱글톤은 필터 없음)
const CONTENT_COLLECTIONS = [
  "site_settings", "hero", "about", "inquiry", "contact", "footer",
  "nav_items", "stats", "centers", "members", "news",
];
const ROW_COLLECTIONS = ["nav_items", "stats", "centers", "members", "news"];

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

// ------------------------------------------------------------ 1) 권한 (Public)
async function seedPublicPermissions() {
  const policies = await api("/policies");
  const pub = policies.find((p) => p.name === "$t:public_label" || (p.role == null && p.admin_access === false && /public/i.test(p.name)));
  if (!pub) throw new Error("Public 정책을 찾지 못함");
  const existing = await api("/permissions?limit=-1");
  const has = new Set(existing.map((p) => `${p.policy}:${p.collection}:${p.action}`));
  for (const collection of [...CONTENT_COLLECTIONS, "directus_files"]) {
    if (has.has(`${pub.id}:${collection}:read`)) { console.log(`· skip perm: public read ${collection}`); continue; }
    const filter = ROW_COLLECTIONS.includes(collection) ? { status: { _eq: "published" } } : {};
    await api("/permissions", "POST", { policy: pub.id, collection, action: "read", fields: ["*"], permissions: filter });
    console.log(`✓ perm: public read ${collection}`);
  }
}

// ------------------------------------------------------------ 2) Editor 역할/유저
async function seedEditor() {
  const roles = await api("/roles");
  let role = roles.find((r) => r.name === "Editor");
  if (!role) {
    role = await api("/roles", "POST", { name: "Editor", icon: "edit_note", description: "콘텐츠 편집자" });
    console.log("✓ role: Editor");
  } else console.log("· skip role: Editor");

  const policies = await api("/policies");
  let policy = policies.find((p) => p.name === "Editor 콘텐츠");
  if (!policy) {
    policy = await api("/policies", "POST", { name: "Editor 콘텐츠", icon: "edit_note", app_access: true, admin_access: false, enforce_tfa: false });
    console.log("✓ policy: Editor 콘텐츠");
  } else console.log("· skip policy: Editor 콘텐츠");

  // 역할 ↔ 정책 연결 (directus_access)
  const access = await api(`/access?filter[role][_eq]=${role.id}&filter[policy][_eq]=${policy.id}`);
  if (!access || access.length === 0) {
    await api("/access", "POST", { role: role.id, policy: policy.id });
    console.log("✓ access: Editor role ↔ policy");
  } else console.log("· skip access link");

  // 콘텐츠 + 파일 CRUD 권한
  const existing = await api("/permissions?limit=-1");
  const has = new Set(existing.map((p) => `${p.policy}:${p.collection}:${p.action}`));
  for (const collection of [...CONTENT_COLLECTIONS, "directus_files", "directus_folders"]) {
    for (const action of ["create", "read", "update", "delete"]) {
      if (has.has(`${policy.id}:${collection}:${action}`)) continue;
      await api("/permissions", "POST", { policy: policy.id, collection, action, fields: ["*"], permissions: {} });
    }
  }
  console.log("✓ perms: Editor CRUD on content + files");

  // 더미 편집자 계정
  const users = await api(`/users?filter[email][_eq]=${encodeURIComponent(EDITOR_EMAIL)}`);
  if (!users || users.length === 0) {
    await api("/users", "POST", { email: EDITOR_EMAIL, password: EDITOR_PASSWORD, role: role.id, status: "active", first_name: "편집", last_name: "담당자" });
    console.log(`✓ user: ${EDITOR_EMAIL} (Editor)`);
  } else console.log(`· skip user: ${EDITOR_EMAIL}`);
}

// ------------------------------------------------------------ 3) 콘텐츠
const singletons = {
  site_settings: {
    site_title: "아주대학교 인공지능연구원 · AIIA",
    site_description: "아주대학교 인공지능연구원(AIIA) — 기초 연구부터 산업 응용까지, 인공지능의 최전선을 넓혀갑니다.",
    contact_address: "경기도 수원시 영통구 월드컵로 206\n아주대학교 인공지능연구원",
    contact_tel: "031-219-0000",
    contact_email: "aiia@ajou.ac.kr",
    header_cta_label: "협력 문의",
    header_cta_href: "#inquiry",
    social_links: [
      { label: "IG", url: "#", icon: "instagram" },
      { label: "YT", url: "#", icon: "youtube" },
      { label: "FB", url: "#", icon: "facebook" },
    ],
  },
  hero: {
    eyebrow: "RESEARCH · EDUCATION · PARTNERSHIP",
    title: "아주대학교\n인공지능연구원",
    lede: "기초 연구부터 산업 응용까지 — 6개 연구센터와 40여 명의 연구진이 함께\n인공지능의 최전선을 넓혀갑니다.",
    cta_primary_label: "연구센터 보기", cta_primary_href: "#centers",
    cta_secondary_label: "협력문의", cta_secondary_href: "#inquiry",
    badge_number: "6", badge_label: "전문 연구센터\n운영 중",
  },
  about: {
    eyebrow: "About AIIA",
    title: "인공지능으로\n더 나은 내일을 연구합니다",
    lede: "AIIA는 아주대학교의 인공지능 연구 역량을 하나로 모아, 학문적 성과와\n사회적 가치를 동시에 추구합니다. 기업·지자체와의 협력을 통해 연구가\n실제 문제 해결로 이어지도록 합니다.",
    pillars: [
      { mono: "R", accent: "blue", title: "연구", desc: "기초부터 응용까지 폭넓은 AI 연구를 수행합니다." },
      { mono: "P", accent: "gold", title: "산학협력", desc: "기업·지자체와 공동연구·자문을 진행합니다." },
      { mono: "E", accent: "blue-bright", title: "교육", desc: "차세대 AI 연구자를 육성합니다." },
      { mono: "O", accent: "success", title: "개방", desc: "연구 성과를 사회와 공유합니다." },
    ],
  },
  inquiry: {
    eyebrow: "Partnership",
    title: "기업·지자체와\n함께 연구합니다",
    lede: "공동연구, 기술 자문·용역, 인력 양성 등 다양한 협력 모델을 운영합니다.\n아래 양식으로 문의를 남겨주시면 담당 센터가 검토 후 연락드립니다.",
    coop_modes: [{ mode: "공동연구 · 위탁연구" }, { mode: "기술 자문 · 용역" }, { mode: "지자체 협력 · 인력 양성" }],
    form_fields: [
      { label: "기관 / 성함", type: "text", options: [] },
      { label: "이메일", type: "email", options: [] },
      { label: "문의 유형", type: "select", options: ["산학협력 / 공동연구", "기술 자문 / 용역", "지자체 협력 사업", "대학원 진학 문의"] },
      { label: "내용", type: "textarea", options: [] },
    ],
    consent_label: "개인정보 수집·이용에 동의합니다",
    submit_label: "문의 보내기",
  },
  contact: {
    eyebrow: "Location",
    title: "오시는 길",
    items: [
      { label: "Address", value: "경기도 수원시 영통구 월드컵로 206\n아주대학교 인공지능연구원" },
      { label: "Tel", value: "031-219-0000" },
      { label: "Email", value: "aiia@ajou.ac.kr" },
    ],
    map_embed: "",
  },
  footer: {
    address_html: "16499 경기도 수원시 영통구\n월드컵로 206 아주대학교 인공지능연구원\nT. 031-219-0000 · aiia@ajou.ac.kr",
    columns: [
      { title: "연구원", links: ["소개", "비전", "연혁", "오시는 길"] },
      { title: "연구", links: ["연구센터", "연구성과", "논문", "세미나"] },
      { title: "참여", links: ["구성원", "채용", "연구연수생", "협력문의"] },
    ],
    copyright: "© 2026 AI Institute of Ajou University. All Rights Reserved.",
    social_links: [{ label: "IG", url: "#" }, { label: "YT", url: "#" }, { label: "FB", url: "#" }],
  },
};

const rows = {
  nav_items: [
    { label: "연구원 소개", href: "#about" }, { label: "연구센터", href: "#centers" },
    { label: "구성원", href: "#members" }, { label: "소식", href: "#news" },
    { label: "오시는 길", href: "#contact" }, { label: "협력문의", href: "#inquiry" },
  ],
  stats: [
    { value: "6", label: "연구센터" }, { value: "42", label: "참여 교수" },
    { value: "130+", label: "SCI급 논문 / 년" }, { value: "35+", label: "산학·정부 협약" },
  ],
  centers: [
    { mono: "GA", accent: "blue", name_ko: "생성형 AI 센터", name_en: "Generative AI", description: "대규모 언어·멀티모달 모델과 생성 기술을 연구합니다.", tag: "LLM · Multimodal" },
    { mono: "VR", accent: "blue-deep", name_ko: "비전·로보틱스 센터", name_en: "Vision & Robotics", description: "인식·제어·자율 시스템으로 물리 세계와 AI를 연결합니다.", tag: "Perception" },
    { mono: "NL", accent: "gold", name_ko: "자연어처리 센터", name_en: "NLP", description: "한국어 중심 언어 이해·생성과 지식 처리를 연구합니다.", tag: "Language" },
    { mono: "HC", accent: "blue-bright", name_ko: "AI 헬스케어 센터", name_en: "AI Healthcare", description: "아주대병원과 협력해 의료 AI를 개발·검증합니다.", tag: "Medical AI" },
    { mono: "TA", accent: "success", name_ko: "신뢰가능 AI 센터", name_en: "Trustworthy AI", description: "안전성·공정성·설명가능성을 연구합니다.", tag: "Safety" },
    { mono: "DM", accent: "silver", name_ko: "데이터·MLOps 센터", name_en: "Data & MLOps", description: "대규모 데이터 파이프라인과 모델 운영을 다룹니다.", tag: "Infra" },
  ],
  members: [
    { name: "김민준 교수", role: "연구원장", area: "Generative AI", accent: "blue" },
    { name: "이서연 교수", role: "부원장", area: "Vision & Robotics", accent: "blue-deep" },
    { name: "박도현 교수", role: "자연어처리 센터장", area: "NLP", accent: "gold" },
    { name: "정하윤 교수", role: "AI 헬스케어 센터장", area: "Medical AI", accent: "blue-bright" },
    { name: "최지우 교수", role: "신뢰가능 AI 센터장", area: "Trustworthy AI", accent: "success" },
    { name: "강준서 교수", role: "데이터·MLOps 센터장", area: "Infra", accent: "silver" },
  ],
  news: [
    { category: "공지", accent: "blue", date: "2026-06-24", title: "2026학년도 2학기 AIIA 연구연수생(인턴) 모집" },
    { category: "세미나", accent: "gold", date: "2026-06-18", title: "AI Frontier Seminar: 대규모 언어모델의 정렬과 안전성" },
    { category: "채용", accent: "success", date: "2026-06-10", title: "생성형 AI 연구센터 박사후연구원(Post-Doc) 채용" },
    { category: "성과", accent: "warning", date: "2026-05-29", title: "AIIA 연구팀, NeurIPS 2026 논문 4편 채택" },
  ],
};

async function seedContent() {
  for (const [collection, data] of Object.entries(singletons)) {
    await api(`/items/${collection}`, "PATCH", data);
    console.log(`✓ singleton: ${collection}`);
  }
  for (const collection of ROW_COLLECTIONS) {
    const current = await api(`/items/${collection}?limit=1`);
    if (current && current.length > 0) { console.log(`· skip rows (not empty): ${collection}`); continue; }
    const payload = rows[collection].map((r, i) => ({ ...r, sort: i + 1, status: "published" }));
    await api(`/items/${collection}`, "POST", payload);
    console.log(`✓ rows: ${collection} (${payload.length})`);
  }
}

await login();
await seedPublicPermissions();
await seedEditor();
await seedContent();
console.log("\n시드 완료.");
