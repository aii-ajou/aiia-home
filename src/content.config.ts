/** 콘텐츠 형식 정본. src/content는 준비 스크립트가 생성한다.
 * 필드 변경 시 cms/pages.yml과 콘텐츠 저장소의 .pages.yml을 함께 갱신한다. */
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { ACCENT_KEYS } from "./lib/content/accent";

const accent = z.enum(ACCENT_KEYS).default("blue");
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? "");
const status = z.enum(["published", "draft", "archived"]).default("published");

/** 싱글톤: 파일 루트가 곧 필드인 flat JSON 하나를 단일 엔트리("main")로 읽는다. */
const singleton = <S extends z.ZodType>(name: string, schema: S) =>
  defineCollection({
    loader: file(`src/content/${name}.json`, {
      parser: (text) => [{ id: "main", ...JSON.parse(text) }],
    }),
    schema,
  });

/** 목록: 폴더 내 JSON 항목들. 파일명(slug)이 엔트리 id 가 된다. */
const rowCollection = <S extends z.ZodType>(name: string, schema: S) =>
  defineCollection({
    loader: glob({ pattern: "*.json", base: `src/content/${name}` }),
    schema,
  });

const socialLink = z.object({
  label: z.string(),
  url: z.string(),
  icon: z.string().optional(),
});

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
    visual_alt: z.string().default("아주대학교 캠퍼스"),
    visual_caption: z.string().default("Ajou University, Suwon"),
  }),
);

const about = singleton(
  "about",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
    pillars: z
      .array(
        z.object({
          mono: z.string(),
          accent,
          title: z.string(),
          desc: z.string(),
        }),
      )
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
      .array(
        z.object({
          label: z.string(),
          type: z.string(),
          options: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    consent_label: z.string(),
    submit_label: z.string(),
  }),
);

const organization = singleton(
  "organization",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
    /** 최상위 지배구조 (원장 / 운영위원회 …). person: 확정 인선(선택) */
    leadership: z
      .array(
        z.object({
          label: z.string(),
          person: z.string().default(""),
          note: z.string(),
        }),
      )
      .default([]),
    /** 연구기획 TF 기능 */
    functions: z
      .array(z.object({ title: z.string(), desc: z.string() }))
      .default([]),
    /** 연구센터 유형 그룹 (도메인별 / 기업 브랜드) — 개별 센터는 수요 기반 유연 설치 */
    center_groups: z
      .array(z.object({ title: z.string(), desc: z.string() }))
      .default([]),
    /** 기업 브랜드 연구센터 3-Tier 운영모델 */
    tiers: z
      .array(
        z.object({ tier: z.string(), name: z.string(), detail: z.string() }),
      )
      .default([]),
  }),
);

const contact = singleton(
  "contact",
  z.object({
    eyebrow: z.string(),
    title: z.string(),
    items: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .default([]),
    map_embed: z.string().nullable().default(null),
    map_image: z.string().nullable().default(null),
  }),
);

const footer = singleton(
  "footer",
  z.object({
    address_html: z.string(),
    columns: z
      .array(
        z.object({ title: z.string(), links: z.array(z.string()).default([]) }),
      )
      .default([]),
    copyright: z.string(),
    social_links: z.array(socialLink).default([]),
  }),
);

const nav_items = rowCollection(
  "nav_items",
  z.object({
    label: z.string(),
    href: z.string(),
    sort: z.number().int(),
    status,
  }),
);

const stats = rowCollection(
  "stats",
  z.object({
    value: z.string(),
    label: z.string(),
    sort: z.number().int(),
    status,
  }),
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
    area: optionalText,
    name_en: optionalText,
    featured: z.boolean().default(false),
    profile_url: z.string().nullable().default(null),
    photo_source: z.string().nullable().default(null),
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
    summary: optionalText,
    source_name: optionalText,
    source_url: z
      .string()
      .regex(/^https?:\/\/[^\s]+$/, "https://로 시작하는 원문 주소")
      .or(z.literal(""))
      .nullable()
      .default(null),
    featured: z.boolean().default(false),
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
  organization,
  inquiry,
  contact,
  footer,
  nav_items,
  stats,
  centers,
  members,
  news,
};
