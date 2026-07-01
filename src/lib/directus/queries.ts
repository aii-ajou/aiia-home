/**
 * queries.ts — 섹션별 콘텐츠를 조회해 "view-ready" 형태로 정규화한다.
 *  - accent 키 → CSS 변수(color) 로 해석 (resolveAccent)
 *  - 파일 id → 공개 에셋 URL 로 변환 (assetUrl)
 * 컴포넌트는 Directus 를 모르고, 여기서 나온 순수 문자열/URL 만 받는다.
 */
import { readItems, readSingleton } from "@directus/sdk";
import { directus } from "./client";
import { resolveAccent } from "./accent";
import { assetUrl, PRESETS } from "./assets";
import type { FormField } from "./schema";
import * as cache from "./cache";

const PUBLISHED = { status: { _eq: "published" } } as const;

// ---- view 타입 (컴포넌트가 import 해서 props 타입으로 사용) --------------------
export interface NavView { label: string; href: string }
export interface CtaView { label: string; href: string }
export interface SiteView { title: string; description: string; ogImage: string | null; headerCta: CtaView }
export interface HeroView {
  eyebrow: string; title: string; lede: string;
  ctaPrimary: CtaView; ctaSecondary: CtaView;
  badgeNumber: string; badgeLabel: string; visual: string | null;
}
export interface PillarView { mono: string; color: string; title: string; desc: string }
export interface AboutView { eyebrow: string; title: string; lede: string; pillars: PillarView[] }
export interface StatView { value: string; label: string }
export interface CenterView { mono: string; color: string; ko: string; en: string; desc: string; tag: string; detailUrl: string | null }
export interface MemberView { name: string; role: string; area: string; color: string; photo: string | null }
export interface NewsView { cat: string; color: string; date: string; title: string; slug: string | null; thumbnail: string | null }
export interface InquiryView {
  eyebrow: string; title: string; lede: string;
  coopModes: string[]; formFields: FormField[]; consentLabel: string; submitLabel: string;
}
export interface ContactItemView { label: string; value: string }
export interface ContactView { eyebrow: string; title: string; items: ContactItemView[]; mapEmbed: string | null; mapImage: string | null }
export interface FooterColumnView { title: string; links: string[] }
export interface SocialView { label: string; url: string }
export interface FooterView { addressHtml: string; columns: FooterColumnView[]; copyright: string; social: SocialView[] }

export interface HomePageData {
  site: SiteView;
  nav: NavView[];
  hero: HeroView;
  about: AboutView;
  stats: StatView[];
  centers: CenterView[];
  members: MemberView[];
  news: NewsView[];
  inquiry: InquiryView;
  contact: ContactView;
  footer: FooterView;
}

// ---- 집계 조회 --------------------------------------------------------------
export async function getHomePageData(): Promise<HomePageData> {
  const [site, hero, about, inquiry, contact, footer, nav, stats, centers, members, news] =
    await Promise.all([
      directus.request(readSingleton("site_settings")),
      directus.request(readSingleton("hero")),
      directus.request(readSingleton("about")),
      directus.request(readSingleton("inquiry")),
      directus.request(readSingleton("contact")),
      directus.request(readSingleton("footer")),
      directus.request(readItems("nav_items", { filter: PUBLISHED, sort: ["sort"] })),
      directus.request(readItems("stats", { filter: PUBLISHED, sort: ["sort"] })),
      directus.request(readItems("centers", { filter: PUBLISHED, sort: ["sort"] })),
      directus.request(readItems("members", { filter: PUBLISHED, sort: ["sort"] })),
      directus.request(readItems("news", { filter: PUBLISHED, sort: ["sort"] })),
    ]);

  return {
    site: {
      title: site.site_title,
      description: site.site_description,
      ogImage: assetUrl(site.og_image, PRESETS.ogImage),
      headerCta: { label: site.header_cta_label, href: site.header_cta_href },
    },
    nav: nav.map((n) => ({ label: n.label, href: n.href })),
    hero: {
      eyebrow: hero.eyebrow,
      title: hero.title,
      lede: hero.lede,
      ctaPrimary: { label: hero.cta_primary_label, href: hero.cta_primary_href },
      ctaSecondary: { label: hero.cta_secondary_label, href: hero.cta_secondary_href },
      badgeNumber: hero.badge_number,
      badgeLabel: hero.badge_label,
      visual: assetUrl(hero.visual_image, PRESETS.heroVisual),
    },
    about: {
      eyebrow: about.eyebrow,
      title: about.title,
      lede: about.lede,
      pillars: (about.pillars ?? []).map((p) => ({
        mono: p.mono, color: resolveAccent(p.accent), title: p.title, desc: p.desc,
      })),
    },
    stats: stats.map((s) => ({ value: s.value, label: s.label })),
    centers: centers.map((c) => ({
      mono: c.mono, color: resolveAccent(c.accent), ko: c.name_ko, en: c.name_en,
      desc: c.description, tag: c.tag, detailUrl: c.detail_url,
    })),
    members: members.map((m) => ({
      name: m.name, role: m.role, area: m.area,
      color: resolveAccent(m.accent), photo: assetUrl(m.photo, PRESETS.memberPhoto),
    })),
    news: news.map((n) => ({
      cat: n.category, color: resolveAccent(n.accent),
      date: (n.date ?? "").replaceAll("-", "."), title: n.title, slug: n.slug,
      thumbnail: assetUrl(n.thumbnail, PRESETS.newsThumb),
    })),
    inquiry: {
      eyebrow: inquiry.eyebrow, title: inquiry.title, lede: inquiry.lede,
      coopModes: (inquiry.coop_modes ?? []).map((m) => m.mode),
      formFields: inquiry.form_fields ?? [],
      consentLabel: inquiry.consent_label, submitLabel: inquiry.submit_label,
    },
    contact: {
      eyebrow: contact.eyebrow, title: contact.title,
      items: contact.items ?? [],
      mapEmbed: contact.map_embed || null,
      mapImage: assetUrl(contact.map_image),
    },
    footer: {
      addressHtml: footer.address_html,
      columns: (footer.columns ?? []).map((c) => ({ title: c.title, links: c.links ?? [] })),
      copyright: footer.copyright,
      social: (footer.social_links ?? []).map((s) => ({ label: s.label, url: s.url })),
    },
  };
}

/**
 * SWR 캐시를 통한 홈 데이터 로드(페이지에서 이걸 사용).
 *  - fresh: 즉시. stale: 즉시 stale + 백그라운드 갱신. cold: 새로 조회.
 *  - stale-if-error: 조회 실패 시 마지막 정상본을 서빙(콜드+장애일 때만 throw).
 */
export async function loadHomePageData(): Promise<HomePageData> {
  const fresh = cache.readFresh();
  if (fresh) return fresh;

  const stale = cache.readAny();
  if (stale) {
    if (!cache.isRefreshing()) {
      cache.setRefreshing(true);
      getHomePageData()
        .then((d) => cache.write(d))
        .catch((e) => console.error("[home] 백그라운드 재검증 실패, stale 유지:", e))
        .finally(() => cache.setRefreshing(false));
    }
    return stale;
  }

  try {
    const data = await getHomePageData();
    cache.write(data);
    return data;
  } catch (e) {
    console.error("[home] 초기 로드 실패(캐시 없음):", e);
    throw e;
  }
}
