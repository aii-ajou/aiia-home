/**
 * server.mjs — Decap CMS 용 GitHub OAuth 릴레이 (의존성 0, 스테이트리스).
 *
 * 역할: /admin(Decap)이 GitHub 로그인할 때 client_secret 을 브라우저에 노출하지
 * 않고 토큰 교환만 대행한다. DB·세션 없음 — 장애 시에도 공개 사이트 무영향.
 *
 * 실행: node --env-file=.env server.mjs   (env 는 .env.example 참조)
 * 프로토콜: Decap 표준 external OAuth (GET /auth → GitHub authorize →
 *           GET /callback → 토큰 교환 → opener 로 postMessage 핸드셰이크)
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT || 8788);
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
// 콤마 구분 허용 오리진(관리 UI 가 뜨는 곳). 예: https://aiia.ajou.ac.kr
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 필요");

const html = (body) => `<!doctype html><meta charset="utf-8"><body>${body}</body>`;

/** postMessage 핸드셰이크: Decap 이 "authorizing:github" 를 보내면 결과를 회신한다. */
const callbackPage = (status, payload) =>
  html(`<script>
  (function () {
    var received = false;
    window.addEventListener("message", function (e) {
      if (received || e.data !== "authorizing:github") return;
      var ok = ${JSON.stringify(ALLOWED_ORIGINS)}.length === 0 ||
               ${JSON.stringify(ALLOWED_ORIGINS)}.indexOf(e.origin) !== -1;
      if (!ok) return;
      received = true;
      e.source.postMessage(
        "authorization:github:${status}:" + ${JSON.stringify(JSON.stringify(payload))},
        e.origin
      );
    });
    if (window.opener) window.opener.postMessage("authorizing:github", "*");
  })();
  </script><p>인증 처리 중… 창이 자동으로 닫히지 않으면 닫아주세요.</p>`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const send = (code, body, type = "text/html; charset=utf-8", headers = {}) => {
    res.writeHead(code, { "content-type": type, ...headers });
    res.end(body);
  };

  if (url.pathname === "/health") return send(200, "ok", "text/plain");

  // 1) 로그인 시작: GitHub authorize 로 리다이렉트 (CSRF 방지 state 쿠키)
  if (url.pathname === "/auth") {
    if (url.searchParams.get("provider") !== "github") return send(400, html("unsupported provider"));
    const state = randomBytes(16).toString("hex");
    const auth = new URL("https://github.com/login/oauth/authorize");
    auth.searchParams.set("client_id", CLIENT_ID);
    auth.searchParams.set("scope", url.searchParams.get("scope") || "repo");
    auth.searchParams.set("state", state);
    return send(302, "", "text/plain", {
      location: auth.href,
      "set-cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    });
  }

  // 2) 콜백: code → access_token 교환 후 opener(Decap)에 전달
  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = /(?:^|;\s*)oauth_state=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
    if (!code || !state || state !== cookieState) {
      return send(400, callbackPage("error", { error: "잘못된 인증 요청(state 불일치)" }));
    }
    try {
      const r = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
      });
      const data = await r.json();
      if (!data.access_token) throw new Error(data.error_description || "토큰 발급 실패");
      return send(200, callbackPage("success", { token: data.access_token, provider: "github" }));
    } catch (e) {
      return send(200, callbackPage("error", { error: String(e.message || e) }));
    }
  }

  send(404, html("not found"));
});

server.listen(PORT, () => console.log(`[oauth-relay] listening on :${PORT}`));
