// @ts-check
import { defineConfig } from "astro/config";

// 서브패스(https://aii-ajou.github.io/aiia-home/) 호환성 검사용 스위치 — PR CI 매트릭스에서만 켠다.
// 운영 배포(deploy.yml)는 커스텀 도메인 루트(https://aiia.ajou.ac.kr/)이므로 켜지 않는다.
// 켠 채로 배포하면 모든 경로가 /aiia-home/… 로 굳어 커스텀 도메인에서 페이지가 깨진다.
const ghPages = process.env.GITHUB_PAGES === "true";

// https://astro.build/config
export default defineConfig({
  devToolbar: { enabled: false },
  // 정식 도메인 — Base.astro의 canonical/OG URL 해석에 필요. 유지할 것.
  site: ghPages ? "https://aii-ajou.github.io" : "https://aiia.ajou.ac.kr",
  base: ghPages ? "/aiia-home" : undefined,

  // SSG(기본 output:'static'): 콘텐츠는 git(src/content/)에서 오고,
  // 빌드가 순수 정적 파일(dist/)을 산출한다. 게시는 커밋 → CI 빌드 → 배포.
});
