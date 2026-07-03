/**
 * queries.ts — src/content/ (Astro Content Collections) 를 조회해 "view-ready"
 * 형태로 정규화한다.
 *  - accent 키 → CSS 변수(color) 로 해석 (resolveAccent)
 *  - 목록 컬렉션은 status=published 만, sort 오름차순
 * 컴포넌트는 콘텐츠 저장 방식을 모르고, 여기서 나온 순수 문자열/URL 만 받는다.
 * 이미지 필드는 저장소 상대 경로(string) 또는 null — astro:assets 변환은
 * 실제 이미지 도입 시(관리 UI 마일스톤) 이 계층에서 처리한다.
 */
import { getCollection } from "astro:content";
import { resolveAccent } from "./accent";

export interface FormField { label: string; type: string; options?: string[] }

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

// ---- 조회 헬퍼 ---------------------------------------------------------------
// 제네릭 컬렉션명(name: C)으로 getCollection 을 감싸면 TS 가 컬렉션별 타입을
// 유니언으로 붕괴시킨다 → 엔트리 배열을 받아 호출 지점에서 타입이 추론되게 한다.

/** 싱글톤: 단일 엔트리("main")의 data 를 반환한다. */
function singleData<T extends { data: unknown }>(entries: T[], name: string): T["data"] {
  const entry = entries[0];
  if (!entry) throw new Error(`싱글톤 콘텐츠 누락: src/content/${name}.json`);
  return entry.data;
}

/** 목록: published 만, sort 오름차순. */
function published<T extends { data: { status: string; sort: number } }>(entries: T[]): T[] {
  return entries
    .filter((e) => e.data.status === "published")
    .sort((a, b) => a.data.sort - b.data.sort);
}

// ---- 집계 조회 (index.astro 가 사용) -----------------------------------------
export async function loadHomePageData(): Promise<HomePageData> {
  const site = singleData(await getCollection("site_settings"), "site_settings");
  const hero = singleData(await getCollection("hero"), "hero");
  const about = singleData(await getCollection("about"), "about");
  const inquiry = singleData(await getCollection("inquiry"), "inquiry");
  const contact = singleData(await getCollection("contact"), "contact");
  const footer = singleData(await getCollection("footer"), "footer");
  const nav = published(await getCollection("nav_items"));
  const stats = published(await getCollection("stats"));
  const centers = published(await getCollection("centers"));
  const members = published(await getCollection("members"));
  const news = published(await getCollection("news"));

  return {
    site: {
      title: site.site_title,
      description: site.site_description,
      ogImage: site.og_image,
      headerCta: { label: site.header_cta_label, href: site.header_cta_href },
    },
    nav: nav.map(({ data: n }) => ({ label: n.label, href: n.href })),
    hero: {
      eyebrow: hero.eyebrow,
      title: hero.title,
      lede: hero.lede,
      ctaPrimary: { label: hero.cta_primary_label, href: hero.cta_primary_href },
      ctaSecondary: { label: hero.cta_secondary_label, href: hero.cta_secondary_href },
      badgeNumber: hero.badge_number,
      badgeLabel: hero.badge_label,
      visual: hero.visual_image,
    },
    about: {
      eyebrow: about.eyebrow,
      title: about.title,
      lede: about.lede,
      pillars: about.pillars.map((p) => ({
        mono: p.mono, color: resolveAccent(p.accent), title: p.title, desc: p.desc,
      })),
    },
    stats: stats.map(({ data: s }) => ({ value: s.value, label: s.label })),
    centers: centers.map(({ data: c }) => ({
      mono: c.mono, color: resolveAccent(c.accent), ko: c.name_ko, en: c.name_en,
      desc: c.description, tag: c.tag, detailUrl: c.detail_url,
    })),
    members: members.map(({ data: m }) => ({
      name: m.name, role: m.role, area: m.area,
      color: resolveAccent(m.accent), photo: m.photo,
    })),
    news: news.map(({ id, data: n }) => ({
      cat: n.category, color: resolveAccent(n.accent),
      date: n.date.replaceAll("-", "."), title: n.title, slug: id,
      thumbnail: n.thumbnail,
    })),
    inquiry: {
      eyebrow: inquiry.eyebrow, title: inquiry.title, lede: inquiry.lede,
      coopModes: inquiry.coop_modes.map((m) => m.mode),
      formFields: inquiry.form_fields,
      consentLabel: inquiry.consent_label, submitLabel: inquiry.submit_label,
    },
    contact: {
      eyebrow: contact.eyebrow, title: contact.title,
      items: contact.items,
      mapEmbed: contact.map_embed || null,
      mapImage: contact.map_image,
    },
    footer: {
      addressHtml: footer.address_html,
      columns: footer.columns.map((c) => ({ title: c.title, links: c.links })),
      copyright: footer.copyright,
      social: footer.social_links.map((s) => ({ label: s.label, url: s.url })),
    },
  };
}
