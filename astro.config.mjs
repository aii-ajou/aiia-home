// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // 정식 도메인 — Base.astro의 canonical/OG URL 해석에 필요. 유지할 것.
  site: "https://aiia.ajou.ac.kr",

  // SSR: 요청 시 Directus(CMS)에서 콘텐츠를 조회해 렌더링한다.
  // 편집자가 게시하면 재빌드 없이 (캐시 퍼지 후) 즉시 반영된다.
  output: "server",
  adapter: node({ mode: "standalone" }),

  // /api/revalidate 웹훅은 자체 시크릿으로 인증한다. Astro 기본 CSRF(checkOrigin)는
  // Origin 헤더가 없는 서버-투-서버 POST(Directus Flow)를 403 으로 막으므로 해제한다.
  security: { checkOrigin: false },

  // 타입 안전 환경변수(astro:env). server=시크릿(런타임), client=PUBLIC(브라우저 노출).
  env: {
    schema: {
      DIRECTUS_URL: envField.string({ context: "server", access: "secret", default: "http://localhost:8055" }),
      DIRECTUS_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      REVALIDATE_SECRET: envField.string({ context: "server", access: "secret", default: "change-me" }),
      PUBLIC_DIRECTUS_ASSET_URL: envField.string({ context: "client", access: "public", default: "http://localhost:8055" }),
    },
  },
});
