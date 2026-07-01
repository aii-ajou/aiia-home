/**
 * assets.ts — Directus 파일 → 브라우저용 에셋 URL(+ 이미지 변환).
 * 파생물 남발을 막기 위해 named preset 만 사용한다.
 */
import { PUBLIC_DIRECTUS_ASSET_URL } from "astro:env/client";

export interface TransformOpts {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "inside" | "outside";
  format?: "webp" | "avif" | "jpg" | "png";
}

/** 파일 id(uuid)를 변환 파라미터가 붙은 공개 에셋 URL 로. null 이면 null. */
export function assetUrl(id: string | null | undefined, opts: TransformOpts = {}): string | null {
  if (!id) return null;
  const p = new URLSearchParams();
  if (opts.width) p.set("width", String(opts.width));
  if (opts.height) p.set("height", String(opts.height));
  if (opts.quality) p.set("quality", String(opts.quality));
  if (opts.fit) p.set("fit", opts.fit);
  if (opts.format) p.set("format", opts.format);
  const qs = p.toString();
  return `${PUBLIC_DIRECTUS_ASSET_URL}/assets/${id}${qs ? `?${qs}` : ""}`;
}

/** 허용된 변환 preset (파생물 수를 제한) */
export const PRESETS = {
  memberPhoto: { width: 480, height: 480, fit: "cover", format: "webp", quality: 82 },
  newsThumb: { width: 640, height: 360, fit: "cover", format: "webp", quality: 82 },
  heroVisual: { width: 900, format: "webp", quality: 82 },
  ogImage: { width: 1200, height: 630, fit: "cover", format: "jpg", quality: 85 },
} as const satisfies Record<string, TransformOpts>;
