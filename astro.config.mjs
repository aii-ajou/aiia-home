// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // 정식 도메인 — Base.astro의 canonical/OG URL 해석에 필요. 유지할 것.
  site: "https://aiia.ajou.ac.kr",

  // SSG(기본 output:'static'): 콘텐츠는 git(src/content/)에서 오고,
  // 빌드가 순수 정적 파일(dist/)을 산출한다. 게시는 커밋 → CI 빌드 → 배포.
});
