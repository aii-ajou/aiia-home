/**
 * content.config.ts — Astro Content Collections 정의 (콘텐츠 정본 = src/content/).
 *
 * 콘텐츠 모델은 docs/PRD.md §7. 싱글톤은 src/content/<name>.json 단일 파일,
 * 목록은 src/content/<name>/<slug>.json 항목 파일. 관리 UI(Decap)의 config 는
 * 이 스키마를 한국어 라벨과 함께 미러링한다 — 필드 추가 시 양쪽을 함께 갱신할 것.
 *
 * 색상 규칙: 강조색은 hex 가 아니라 accent 키(enum)만 저장한다.
 * 키 → var(--aiia-*) 해석은 데이터 계층(accent.ts)이 담당한다.
 */
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { ACCENT_KEYS } from "./lib/content/accent";

const accent = z.enum(ACCENT_KEYS);
const status = z.enum(["published", "draft", "archived"]).default("published");

/** 싱글톤: 파일 루트가 곧 필드인 flat JSON 하나를 단일 엔트리("main")로 읽는다. */
const singleton = <S extends z.ZodTypeAny>(name: string, schema: S) =>
  defineCollection({
    loader: file(`src/content/${name}.json`, {
      parser: (text) => [{ id: "main", ...JSON.parse(text) }],
    }),
    schema,
  });

/** 목록: 폴더 내 JSON 항목들. 파일명(slug)이 엔트리 id 가 된다. */
const rowCollection = <S extends z.ZodTypeAny>(name: string, schema: S) =>
  defineCollection({
    loader: glob({ pattern: "*.json", base: `src/content/${name}` }),
    schema,
  });

const socialLink = z.object({ label: z.string(), url: z.string(), icon: z.string().optional() });

const site_settings = singleton(
  "site_settings",
  z.object({
    site_title: z.string(),
    site_description: z.string(),
    og_image: z.string().nullable().default(null),
    favicon: z.string().nullable().default(null),
    brand_symbol: z.string().nullable().default(null),
    contact_address: z.string(),
    contact_tel: z.string(),
    contact_email: z.string(),
    header_cta_label: z.string(),
    header_cta_href: z.string(),
    social_links: z.array(socialLink).default([]),
  }),
);

const hero = singleton(
  "hero",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
    cta_primary_label: z.string(),
    cta_primary_href: z.string(),
    cta_secondary_label: z.string(),
    cta_secondary_href: z.string(),
    badge_number: z.string().nullable().default(null),
    badge_label: z.string().nullable().default(null),
    visual_image: z.string().nullable().default(null),
  }),
);

const about = singleton(
  "about",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
    pillars: z
      .array(z.object({ mono: z.string(), accent, title: z.string(), desc: z.string() }))
      .default([]),
  }),
);

const inquiry = singleton(
  "inquiry",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
    coop_modes: z.array(z.object({ mode: z.string() })).default([]),
    form_fields: z
      .array(z.object({ label: z.string(), type: z.string(), options: z.array(z.string()).default([]) }))
      .default([]),
    consent_label: z.string(),
    submit_label: z.string(),
  }),
);

const contact = singleton(
  "contact",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    items: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    map_embed: z.string().nullable().default(null),
    map_image: z.string().nullable().default(null),
  }),
);

const footer = singleton(
  "footer",
  z.object({
    address_html: z.string(),
    columns: z
      .array(z.object({ title: z.string(), links: z.array(z.string()).default([]) }))
      .default([]),
    copyright: z.string(),
    social_links: z.array(socialLink).default([]),
  }),
);

const nav_items = rowCollection(
  "nav_items",
  z.object({ label: z.string(), href: z.string(), sort: z.number().int(), status }),
);

const stats = rowCollection(
  "stats",
  z.object({ value: z.string(), label: z.string(), sort: z.number().int(), status }),
);

const centers = rowCollection(
  "centers",
  z.object({
    mono: z.string(),
    accent,
    name_ko: z.string(),
    name_en: z.string(),
    description: z.string(),
    tag: z.string(),
    detail_url: z.string().nullable().default(null),
    sort: z.number().int(),
    status,
  }),
);

const members = rowCollection(
  "members",
  z.object({
    name: z.string(),
    role: z.string(),
    area: z.string(),
    accent,
    photo: z.string().nullable().default(null),
    bio: z.string().nullable().default(null),
    email: z.string().nullable().default(null),
    sort: z.number().int(),
    status,
  }),
);

const news = rowCollection(
  "news",
  z.object({
    category: z.string(),
    accent,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    title: z.string(),
    body: z.string().nullable().default(null),
    thumbnail: z.string().nullable().default(null),
    attachment: z.string().nullable().default(null),
    sort: z.number().int(),
    status,
  }),
);

export const collections = {
  site_settings,
  hero,
  about,
  inquiry,
  contact,
  footer,
  nav_items,
  stats,
  centers,
  members,
  news,
};
