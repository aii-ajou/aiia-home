/**
 * build-schema.mjs — AIIA 콘텐츠 모델을 Directus 에 프로그램적으로 생성한다.
 *
 * 이 스크립트는 데이터 모델의 "저작 도구"다. 신규(빈) 인스턴스에 대해 멱등적으로 실행되며,
 * 이미 존재하는 컬렉션은 건너뛴다. 실행 후 `npm run schema:snapshot` 으로
 * schema/snapshot.yaml(적용용 정본)을 갱신·커밋한다.
 *
 * 실행:  node --env-file=.env schema/build-schema.mjs   (cms/ 에서)
 * 필요:  Directus 가 PUBLIC_URL 에서 실행 중, ADMIN_EMAIL/ADMIN_PASSWORD 로 로그인 가능.
 *
 * 색상: accent 는 자유 색상값이 아니라 고정 키(드롭다운)만 저장한다.
 *       키→CSS 토큰 매핑 정본은 src/lib/directus/accent.ts. (아래 목록은 그 사본)
 */

const URL = process.env.PUBLIC_URL || "http://localhost:8055";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

// src/lib/directus/accent.ts 의 ACCENT_KEYS 와 동기화할 것.
const ACCENT_KEYS = [
  "blue", "blue-deep", "blue-bright", "gold", "sky",
  "yellow", "silver", "success", "warning", "danger",
];
const ACCENT_CHOICES = ACCENT_KEYS.map((k) => ({ text: k, value: k }));

// ---------------------------------------------------------------- REST helper
let TOKEN;
async function login() {
  const r = await fetch(`${URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login 실패 (${r.status}): ${await r.text()}`);
  TOKEN = (await r.json()).data.access_token;
}
async function api(path, method = "GET", body) {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${t}`);
  return j?.data;
}

// ---------------------------------------------------------------- field factories
const str = (field, o = {}) => ({
  field, type: "string",
  meta: { interface: "input", width: o.width || "full", note: o.note, sort: o.sort, ...(o.meta || {}) },
  schema: { is_nullable: o.nullable ?? true, default_value: o.default ?? null },
});
const multiline = (field, o = {}) => ({
  field, type: "text",
  meta: { interface: "input-multiline", width: "full", note: o.note, ...(o.meta || {}) },
  schema: { is_nullable: o.nullable ?? true },
});
const markdown = (field, o = {}) => ({
  field, type: "text",
  meta: { interface: "input-rich-text-md", width: "full", note: o.note },
  schema: { is_nullable: o.nullable ?? true },
});
const dateField = (field, o = {}) => ({
  field, type: "date",
  meta: { interface: "datetime", width: "half", note: o.note },
  schema: { is_nullable: o.nullable ?? true },
});
const accent = (field = "accent", o = {}) => ({
  field, type: "string",
  meta: { interface: "select-dropdown", width: "half", display: "labels", note: o.note || "강조색(토큰 키)", options: { choices: ACCENT_CHOICES } },
  schema: { is_nullable: false, default_value: "blue" },
});
// 단일 파일(M2O directus_files). 관계는 아래 relateFile() 로 별도 생성.
const fileField = (field, o = {}) => ({
  field, type: "uuid",
  meta: { interface: o.image === false ? "file" : "file-image", width: "half", special: ["file"], note: o.note },
  schema: { is_nullable: true },
});
const jsonList = (field, fields, o = {}) => ({
  field, type: "json",
  meta: { interface: "list", special: ["cast-json"], width: "full", note: o.note, options: { fields } },
  schema: { is_nullable: true },
});
// jsonList 내부 서브필드 정의
const sub = (field, iface, o = {}) => ({
  field, name: o.name || field, type: o.type || "string",
  meta: { field, interface: iface, width: o.width || "full", options: o.options, type: o.type || "string" },
});
const sortField = () => ({
  field: "sort", type: "integer",
  meta: { interface: "input", hidden: true },
  schema: { is_nullable: true },
});
const statusField = () => ({
  field: "status", type: "string",
  meta: {
    interface: "select-dropdown", width: "half", display: "labels",
    options: { choices: [
      { text: "$t:published", value: "published" },
      { text: "$t:draft", value: "draft" },
      { text: "$t:archived", value: "archived" },
    ] },
  },
  schema: { is_nullable: false, default_value: "draft" },
});
const pk = () => ({
  field: "id", type: "integer",
  meta: { hidden: true },
  schema: { is_primary_key: true, has_auto_increment: true },
});

// ---------------------------------------------------------------- create helpers
let existing;
async function ensureCollection(collection, { singleton = false, icon = "article", note = "", fields = [] }) {
  if (existing.has(collection)) {
    console.log(`· skip (exists): ${collection}`);
    return;
  }
  const meta = { icon, note, singleton, collection };
  if (!singleton) { meta.sort_field = "sort"; }
  await api("/collections", "POST", {
    collection,
    meta,
    schema: { name: collection },
    fields: [pk(), ...fields],
  });
  existing.add(collection);
  console.log(`✓ collection: ${collection}${singleton ? " (singleton)" : ""}`);
}
// 단일 파일 필드용 M2O 관계 (컬렉션 생성 후 호출)
async function relateFile(collection, field) {
  await api("/relations", "POST", {
    collection, field,
    related_collection: "directus_files",
    schema: { on_delete: "SET NULL" },
    meta: { sort_field: null },
  });
  console.log(`  ↳ relation: ${collection}.${field} → directus_files`);
}

// ---------------------------------------------------------------- model
async function build() {
  existing = new Set((await api("/collections")).map((c) => c.collection));

  // ===== 싱글톤 =====
  await ensureCollection("site_settings", {
    singleton: true, icon: "settings", note: "사이트 전역 설정 · 연락처 · 브랜드",
    fields: [
      str("site_title", { note: "기본 메타/OG 제목" }),
      multiline("site_description", { note: "기본 메타/OG 설명" }),
      fileField("og_image"), fileField("favicon", { image: false }), fileField("brand_symbol"),
      multiline("contact_address"),
      str("contact_tel", { width: "half" }), str("contact_email", { width: "half" }),
      str("header_cta_label", { width: "half" }), str("header_cta_href", { width: "half" }),
      jsonList("social_links", [sub("label", "input", { width: "half" }), sub("url", "input", { width: "half" }), sub("icon", "input", { width: "half" })], { note: "SNS 링크" }),
    ],
  });
  await relateFile("site_settings", "og_image");
  await relateFile("site_settings", "favicon");
  await relateFile("site_settings", "brand_symbol");

  await ensureCollection("hero", {
    singleton: true, icon: "web", note: "Hero 섹션",
    fields: [
      str("eyebrow"), multiline("title", { note: "개행 허용" }), multiline("lede"),
      str("cta_primary_label", { width: "half" }), str("cta_primary_href", { width: "half" }),
      str("cta_secondary_label", { width: "half" }), str("cta_secondary_href", { width: "half" }),
      str("badge_number", { width: "half" }), str("badge_label", { width: "half", note: "개행 허용" }),
      fileField("visual_image"),
    ],
  });
  await relateFile("hero", "visual_image");

  await ensureCollection("about", {
    singleton: true, icon: "info", note: "About 섹션",
    fields: [
      str("eyebrow"), multiline("title"), multiline("lede"),
      jsonList("pillars", [
        sub("mono", "input", { width: "half" }),
        sub("accent", "select-dropdown", { width: "half", options: { choices: ACCENT_CHOICES } }),
        sub("title", "input"), sub("desc", "input-multiline", { type: "text" }),
      ], { note: "핵심 가치(4개)" }),
    ],
  });

  await ensureCollection("inquiry", {
    singleton: true, icon: "handshake", note: "협력문의 섹션 + 폼 설정",
    fields: [
      str("eyebrow"), multiline("title"), multiline("lede"),
      jsonList("coop_modes", [sub("mode", "input")], { note: "협력 모델 목록" }),
      jsonList("form_fields", [
        sub("label", "input", { width: "half" }),
        sub("type", "select-dropdown", { width: "half", options: { choices: [
          { text: "text", value: "text" }, { text: "email", value: "email" },
          { text: "select", value: "select" }, { text: "textarea", value: "textarea" },
        ] } }),
        sub("options", "tags", { type: "json", options: {} }),
      ], { note: "문의 폼 필드 구성" }),
      str("consent_label"), str("submit_label", { width: "half" }),
    ],
  });

  await ensureCollection("contact", {
    singleton: true, icon: "place", note: "오시는 길",
    fields: [
      str("eyebrow"), multiline("title"),
      jsonList("items", [sub("label", "input", { width: "half" }), sub("value", "input", { width: "half" })], { note: "주소/전화/이메일" }),
      multiline("map_embed", { note: "지도 iframe/임베드 (렌더 시 sanitize)" }),
      fileField("map_image"),
    ],
  });
  await relateFile("contact", "map_image");

  await ensureCollection("footer", {
    singleton: true, icon: "call_to_action", note: "푸터",
    fields: [
      multiline("address_html"),
      jsonList("columns", [
        sub("title", "input", { width: "half" }),
        sub("links", "tags", { type: "json", width: "full", options: {} }),
      ], { note: "푸터 컬럼(제목 + 링크 라벨들)" }),
      str("copyright"),
      jsonList("social_links", [sub("label", "input", { width: "half" }), sub("url", "input", { width: "half" })]),
    ],
  });

  // ===== 컬렉션 =====
  await ensureCollection("nav_items", {
    icon: "menu", note: "상단 내비게이션",
    fields: [str("label", { width: "half" }), str("href", { width: "half" }), sortField(), statusField()],
  });

  await ensureCollection("stats", {
    icon: "leaderboard", note: "핵심 통계",
    fields: [str("value", { width: "half", note: '예: "130+"' }), str("label", { width: "half" }), sortField(), statusField()],
  });

  await ensureCollection("centers", {
    icon: "science", note: "연구센터",
    fields: [
      str("mono", { width: "half", note: '약자 예: "GA"' }), accent(),
      str("name_ko"), str("name_en", { note: "영문명(후속 EN 대비)" }),
      multiline("description"), str("tag", { note: "예: LLM · Multimodal" }),
      str("detail_url", { note: "자세히 링크(선택)" }),
      sortField(), statusField(),
    ],
  });

  await ensureCollection("members", {
    icon: "groups", note: "구성원",
    fields: [
      str("name", { width: "half" }), str("role", { width: "half" }),
      str("area", { width: "half" }), accent(),
      fileField("photo", { note: "헤드샷(없으면 플레이스홀더)" }),
      multiline("bio", { note: "약력(선택)" }), str("email", { width: "half", note: "선택" }),
      sortField(), statusField(),
    ],
  });
  await relateFile("members", "photo");

  await ensureCollection("news", {
    icon: "feed", note: "소식",
    fields: [
      str("category", { width: "half", note: "공지/세미나/채용/성과" }), accent(),
      dateField("date"), str("title"),
      markdown("body", { note: "본문(선택, 상세 페이지용)" }),
      fileField("thumbnail"),
      str("slug", { width: "half", note: "상세 URL(선택, 고유)" }),
      sortField(), statusField(),
    ],
  });
  await relateFile("news", "thumbnail");

  console.log("\n스키마 구축 완료.");
}

await login();
await build();
