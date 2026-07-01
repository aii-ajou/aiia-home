/**
 * html.ts — CMS 텍스트를 안전하게 표시하기 위한 최소 헬퍼.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 개행(\n)을 <br /> 로. 우선 이스케이프하므로 HTML 주입 위험 없음.
 * 기존 마크업이 <br /> 로 줄을 나누던 자리(hero/about 제목 등)에 쓴다.
 */
export function nl2br(s: string | null | undefined): string {
  if (!s) return "";
  return escapeHtml(s).replace(/\n/g, "<br />");
}
