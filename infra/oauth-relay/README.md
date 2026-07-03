# OAuth 릴레이 — Decap CMS GitHub 로그인용

`/admin`(Decap CMS)의 "GitHub 로 로그인"이 동작하려면 `client_secret` 을 보관하고
토큰 교환만 대행하는 작은 서버가 하나 필요하다. 이 디렉토리의 `server.mjs` 가 그것이다
— **의존성 0, 상태 없음(DB/세션 없음)**. 릴레이가 죽어도 공개 사이트에는 영향이 없고
편집 로그인만 일시 불가.

## 설정 (1회)

1. **GitHub OAuth App 생성** — `aii-ajou` 조직 Settings → Developer settings → OAuth Apps
   - Homepage URL: 사이트 주소
   - Authorization callback URL: `https://<릴레이 도메인>/callback`
2. `.env.example` → `.env` 로 복사해 `GITHUB_CLIENT_ID/SECRET`, `ALLOWED_ORIGINS` 기입.
3. 실행: `node --env-file=.env server.mjs` (Node 22, systemd 등록 권장. `/health` 로 헬스체크)
4. 웹앱 `public/admin/config.yml` 의 `backend.base_url` 에 릴레이 주소를 기입.

## nginx 예시 (대학 서버에서 경로 하나로 서빙)

```nginx
location /oauth/ {            # base_url: https://aiia.ajou.ac.kr/oauth
    proxy_pass http://127.0.0.1:8788/;
}
```

이 경우 config.yml 은 `base_url: https://aiia.ajou.ac.kr`, `auth_endpoint: oauth/auth`.

## 대안

- **sveltia-cms-auth** (Cloudflare Workers, 무료): 서버 없이 워커로 같은 역할.
  https://github.com/sveltia/sveltia-cms-auth — Decap 과 호환.
