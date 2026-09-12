/**
 * url.ts — 내부 링크를 Astro base(서브패스 호스팅)에 맞춰 접두한다.
 * import.meta.env.BASE_URL 은 base 설정에 따라 "/"(루트) 또는 "/aiia-home"
 * (트레일링 슬래시 없음)이 될 수 있으므로, 앞뒤 슬래시를 정규화해 정확히
 * 하나만 남긴다. 예: withBase("news/foo") → "/news/foo" | "/aiia-home/news/foo".
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ""); // 끝 슬래시 제거
  const rel = path.replace(/^\//, ""); // 앞 슬래시 제거
  return `${base}/${rel}`;
}

/** 외부 주소는 유지하고 내부 링크·미디어는 배포 경로를 반영한다. */
export function siteUrl(path: string): string {
  if (/^(https?:|mailto:|tel:)/i.test(path)) return path;
  if (/^(javascript:|data:|\/\/)/i.test(path)) return "#";
  return withBase(path);
}
