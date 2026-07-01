# cms/ — Directus (콘텐츠 관리 시스템)

AIIA 홈페이지의 콘텐츠는 Directus 에서 관리한다. 이 디렉터리는 **버전관리되는** CMS 정의를 담는다:

```
cms/
├─ schema/snapshot.yaml   # `directus schema snapshot` 결과 (데이터 모델, 커밋 대상)
├─ seed/seed.mjs          # 멱등 placeholder 콘텐츠 + 더미 role/user (커밋 대상)
├─ seed/assets/           # seed 용 placeholder 이미지 (커밋 대상)
└─ (node_modules/, uploads/, *.sqlite, .env)  ← 런타임 산출물, .gitignore 처리
```

## 로컬 런타임 (Docker 없이): npm + SQLite

이 개발 환경에는 Docker 가 없으므로 로컬에서는 Directus 를 **npm 패키지 + SQLite** 로 실행한다.
루트 Astro 패키지와 분리된 `cms/` 자체 `package.json`/`node_modules` 를 쓰므로 루트
`npm audit` 표면은 Astro 로만 유지된다.

```bash
cd cms
cp ../infra/env/.env.directus.example .env   # 최초 1회, 필요 시 KEY/SECRET 교체
npm install                 # directus 설치 (cms/ 로컬)

npm run bootstrap           # SQLite DB 초기화 + 관리자 계정 생성(.env 로 지정)
npm run schema:apply        # schema/snapshot.yaml 적용 (데이터 모델)
npm run start &             # http://localhost:8055 (Studio) — 백그라운드
npm run seed                # 권한 + Editor 역할/더미 유저 + placeholder 콘텐츠
npm run flow                # (선택) 게시 즉시 반영 Flow: 변경 시 웹앱 /api/revalidate 호출
```

> **게시 즉시 반영**: `npm run flow` 이 콘텐츠 변경 → `REVALIDATE_URL` 로 POST 하는 Directus
> Flow 를 만든다. 로컬은 웹앱이 loopback 이라 `.env` 의 `IMPORT_IP_DENY_LIST=` (SSRF 차단 해제)가
> 필요하다. Flow 없이도 SSR 캐시 TTL(30s) 내에 자동 반영된다.

- 로컬 환경변수는 `cms/.env`(커밋 안 함). 예시는 `infra/env/.env.directus.example`.
- **더미 계정(로컬 전용):** 관리자 `admin@example.com` / `admin1234`,
  편집자 `editor@example.com` / `editor1234`.
- **모델을 바꾸려면:** `schema/build-schema.mjs` 를 수정 → `npm run build-schema`(빈 인스턴스) 또는
  Studio 에서 편집 → **반드시** `npm run schema:snapshot` 으로 `schema/snapshot.yaml` 갱신 후 커밋.
- **완전 재현:** `rm data.db && npm run bootstrap && npm run schema:apply && npm run start & && npm run seed`.

## 운영(대학 서버): Docker + Postgres — **추후**

운영 배포는 Docker + Postgres 로 하며, 학교 서버 정보 확보 후 진행한다.
계획/체크리스트는 `docs/BACKLOG.md` 의 "대학 서버 테스트 배포" 항목과 `infra/` 참조.
스키마 스냅샷은 DB 비의존적이라 로컬(SQLite)→운영(Postgres) 로 그대로 apply 한다.

## 재현성 규칙
- **클릭 전용 설정 금지.** 모델 변경은 반드시 `schema snapshot` 으로 `snapshot.yaml` 갱신 후 커밋.
- 콘텐츠/역할/유저는 `seed/seed.mjs`(멱등)로 재현. DB 삭제 후 `apply → seed` 로 완전 복구되어야 한다.
