/**
 * POST /api/revalidate — 홈 데이터 캐시 무효화(게시 즉시 반영).
 * Directus Flow(콘텐츠 변경 트리거)가 공유 시크릿과 함께 호출한다.
 * 인증: 헤더 `x-revalidate-secret` 또는 쿼리 `?secret=` == REVALIDATE_SECRET.
 * 로컬 Flow 연결: cms/seed/revalidate-flow.mjs 참조.
 */
import type { APIRoute } from "astro";
import { REVALIDATE_SECRET } from "astro:env/server";
import { purge } from "../../lib/directus/cache";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  const provided = request.headers.get("x-revalidate-secret") ?? url.searchParams.get("secret");
  if (!provided || provided !== REVALIDATE_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  purge();
  return new Response(JSON.stringify({ revalidated: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
