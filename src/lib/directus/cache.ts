/**
 * cache.ts — 홈 데이터 인메모리 SWR 캐시.
 *  - fresh(TTL 내): 즉시 반환.
 *  - stale(TTL 초과): 즉시 stale 반환 + 백그라운드 재검증(요청 지연 없음).
 *  - purge(): 무효화 → 다음 요청은 최신본을 새로 가져옴(게시 즉시 반영, /api/revalidate 웹훅).
 *  - stale-if-error: Directus 장애 시 마지막 정상본을 계속 서빙(queries.loadHomePageData).
 */
import type { HomePageData } from "./queries";

const TTL_MS = 30_000;

let entry: { value: HomePageData; at: number } | null = null;
let refreshing = false;

/** TTL 내면 값을, 아니면 null */
export function readFresh(): HomePageData | null {
  if (entry && Date.now() - entry.at < TTL_MS) return entry.value;
  return null;
}

/** 신선도 무관 마지막 값(stale 포함) */
export function readAny(): HomePageData | null {
  return entry?.value ?? null;
}

export function write(value: HomePageData): void {
  entry = { value, at: Date.now() };
}

/** 캐시 무효화(웹훅/게시 시). 다음 요청은 새로 가져온다. */
export function purge(): void {
  entry = null;
}

export function isRefreshing(): boolean {
  return refreshing;
}
export function setRefreshing(v: boolean): void {
  refreshing = v;
}
