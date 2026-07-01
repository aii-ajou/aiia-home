/**
 * accent.ts — 디자인 시스템 브리지 (accent 키 → CSS 토큰 변수)
 *
 * 각 콘텐츠의 강조색(center/member/news/about pillar 등)은 hex가 아니라
 * aiia-tokens.css 의 `--aiia-*` 토큰을 참조해야 다크모드·아주 브랜드 규정이 유지된다.
 *
 * → CMS(Directus)에는 자유 색상값이 아니라 아래 키 중 하나만 저장한다(고정 드롭다운).
 *   데이터 계층이 이 맵으로 `키 → "var(--aiia-*)"` 문자열을 해석해 컴포넌트에 넘긴다.
 *   원시 hex 는 DB 에 절대 저장되지 않는다.
 *
 * 키 집합은 aiia-tokens.css 의 브랜드/상태 토큰과 1:1 로 대응한다. 새 강조색이 필요하면
 * 먼저 토큰을 추가한 뒤 여기 키를 추가한다(임의 hex 추가 금지).
 */

export const ACCENT_KEYS = [
  "blue",
  "blue-deep",
  "blue-bright",
  "gold",
  "sky",
  "yellow",
  "silver",
  "success",
  "warning",
  "danger",
] as const;

export type AccentKey = (typeof ACCENT_KEYS)[number];

/** accent 키 → aiia-tokens.css 변수 참조 문자열 */
const ACCENT_VAR: Record<AccentKey, string> = {
  blue: "var(--aiia-blue)",
  "blue-deep": "var(--aiia-blue-deep)",
  "blue-bright": "var(--aiia-blue-bright)",
  gold: "var(--aiia-gold)",
  sky: "var(--aiia-sky)",
  yellow: "var(--aiia-yellow)",
  silver: "var(--aiia-silver)",
  success: "var(--aiia-success)",
  warning: "var(--aiia-warning)",
  danger: "var(--aiia-danger)",
};

/** 기본 강조색(값 누락/오타 시 안전한 폴백) — 브랜드 primary 계열 */
export const DEFAULT_ACCENT: AccentKey = "blue";

/** 임의 문자열이 유효한 accent 키인지 확인 */
export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === "string" && (ACCENT_KEYS as readonly string[]).includes(value);
}

/**
 * accent 키를 `var(--aiia-*)` CSS 문자열로 해석한다.
 * null/undefined/미지의 값은 DEFAULT_ACCENT 로 폴백한다.
 */
export function resolveAccent(key: string | null | undefined): string {
  if (isAccentKey(key)) return ACCENT_VAR[key];
  return ACCENT_VAR[DEFAULT_ACCENT];
}

/** Directus 드롭다운(choices) 정의에 쓰기 위한 옵션 목록 */
export const ACCENT_CHOICES = ACCENT_KEYS.map((key) => ({ text: key, value: key }));
