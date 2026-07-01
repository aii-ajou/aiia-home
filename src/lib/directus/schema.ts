/**
 * schema.ts — Directus 컬렉션의 raw 타입(@directus/sdk 제네릭용).
 * 정본은 cms/schema/snapshot.yaml. 여기 타입은 그와 동기화한다.
 */
import type { AccentKey } from "./accent";

export type Status = "published" | "draft" | "archived";

export interface SocialLink { label: string; url: string; icon?: string }
export interface Pillar { mono: string; accent: AccentKey; title: string; desc: string }
export interface CoopMode { mode: string }
export interface FormField { label: string; type: string; options?: string[] }
export interface ContactItem { label: string; value: string }
export interface FooterColumn { title: string; links: string[] }

/** 단일 파일 필드는 uuid(문자열) 또는 null 로 온다. */
export type FileId = string | null;

export interface SiteSettings {
  site_title: string;
  site_description: string;
  og_image: FileId;
  favicon: FileId;
  brand_symbol: FileId;
  contact_address: string;
  contact_tel: string;
  contact_email: string;
  header_cta_label: string;
  header_cta_href: string;
  social_links: SocialLink[] | null;
}

export interface Hero {
  eyebrow: string;
  title: string;
  lede: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
  badge_number: string;
  badge_label: string;
  visual_image: FileId;
}

export interface About {
  eyebrow: string;
  title: string;
  lede: string;
  pillars: Pillar[] | null;
}

export interface Inquiry {
  eyebrow: string;
  title: string;
  lede: string;
  coop_modes: CoopMode[] | null;
  form_fields: FormField[] | null;
  consent_label: string;
  submit_label: string;
}

export interface Contact {
  eyebrow: string;
  title: string;
  items: ContactItem[] | null;
  map_embed: string | null;
  map_image: FileId;
}

export interface Footer {
  address_html: string;
  columns: FooterColumn[] | null;
  copyright: string;
  social_links: SocialLink[] | null;
}

export interface NavItem { id: number; label: string; href: string; sort: number | null; status: Status }
export interface Stat { id: number; value: string; label: string; sort: number | null; status: Status }
export interface Center {
  id: number; mono: string; accent: AccentKey; name_ko: string; name_en: string;
  description: string; tag: string; detail_url: string | null; sort: number | null; status: Status;
}
export interface Member {
  id: number; name: string; role: string; area: string; accent: AccentKey;
  photo: FileId; bio: string | null; email: string | null; sort: number | null; status: Status;
}
export interface NewsItem {
  id: number; category: string; accent: AccentKey; date: string; title: string;
  body: string | null; thumbnail: FileId; slug: string | null; sort: number | null; status: Status;
}

/** @directus/sdk 제네릭에 넘길 스키마 맵(싱글톤=객체, 컬렉션=배열). */
export interface Schema {
  site_settings: SiteSettings;
  hero: Hero;
  about: About;
  inquiry: Inquiry;
  contact: Contact;
  footer: Footer;
  nav_items: NavItem[];
  stats: Stat[];
  centers: Center[];
  members: Member[];
  news: NewsItem[];
}
