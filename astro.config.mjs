// @ts-check
import { defineConfig } from "astro/config";

// 임시 공개 호스팅(GitHub Pages, 리포 서브패스) 빌드 스위치 — CI 에서만 켠다.
// 대학 서버(루트 도메인) 배포에서는 불필요하며, 기본값이 정본이다.
const ghPages = process.env.GITHUB_PAGES === "true";

// https://astro.build/config
export default defineConfig({
  // 정식 도메인 — Base.astro의 canonical/OG URL 해석에 필요. 유지할 것.
  site: ghPages ? "https://aii-ajou.github.io" : "https://aiia.ajou.ac.kr",
  base: ghPages ? "/aiia-home" : undefined,

  // SSG(기본 output:'static'): 콘텐츠는 git(src/content/)에서 오고,
  // 빌드가 순수 정적 파일(dist/)을 산출한다. 게시는 커밋 → CI 빌드 → 배포.
});
