# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **아키텍처: Directus(CMS) + Astro SSR.** 콘텐츠는 하드코딩 배열이 아니라 **Directus** 에서 오고,
> 각 섹션 컴포넌트는 `Astro.props` 로 데이터를 받는다. 콘텐츠 편집은 **Directus 관리자(Studio)** 에서 한다.
> 목표·데이터모델·수용기준은 `docs/PRD.md`, 미룬 작업(대학서버 배포·SSO·EN 등)은 `docs/BACKLOG.md` 참조.
> **디자인 시스템(토큰/`global.css`/`Base.astro`/공유 primitive)과 각 컴포넌트의 scoped `<style>`은 동결**한다.

## Project

Homepage for **AIIA — 아주대학교 인공지능연구원 (AI Institute of Ajou University)**. An Astro **SSR** site (`@astrojs/node` standalone) whose content is managed in **Directus (self-hosted CMS, Postgres in prod / SQLite locally)**. UI copy and code comments are in Korean; the default `lang` is `ko` (Base.astro also supports `en`).

## Commands

**웹앱 (루트, Astro SSR):**
- `npm install` — 의존성 설치
- `npm run dev` — dev 서버(핫리로드). Directus 가 떠 있어야 콘텐츠가 보인다.
- `npm run build` — `dist/` 로 SSR 빌드
- `npm run preview` / `node --env-file=.env ./dist/server/entry.mjs` — 빌드 서버 실행(env 필요)
- `npm run check` — `astro check` (0 errors 유지)

**CMS (`cms/`, Directus — 별도 런타임/패키지):** `cd cms` 후 `npm install` →
`npm run bootstrap` → `npm run schema:apply` → `npm run start &` → `npm run seed` → `npm run flow`.
자세한 로컬 실행/재현/더미 계정은 `cms/README.md`. env 예시는 `infra/env/.env.directus.example`.
웹앱 env(`DIRECTUS_URL` 등)는 루트 `.env`(예시 `.env.example`).

## Build tooling / versions

- **Astro 7 SSR** (`output:'server'` + `@astrojs/node` standalone) on **Node 22** (nvm, `.nvmrc`=22). `engines` = Node `^18.20.8 || ^20.3.0 || >=22.0.0`.
- 데이터 접근은 **`@directus/sdk`** 하나만 추가(루트). **Directus 본체는 `cms/` 의 별도 패키지**라 루트 `npm audit` 표면에 안 들어온다 — `npm audit` 는 **0 vulnerabilities** 유지. `yaml` override(GHSA-48c2-rrv3-qjmp)도 유지.
- 환경변수는 **`astro:env`** 스키마(`astro.config.mjs`)로 타입 안전하게 정의: `DIRECTUS_URL`, `DIRECTUS_TOKEN`(선택), `REVALIDATE_SECRET`(server), `PUBLIC_DIRECTUS_ASSET_URL`(client).
- `astro.config.mjs` 는 `site: "https://aiia.ajou.ac.kr"`(canonical/OG) 와 `security.checkOrigin:false`(시크릿 인증하는 `/api/revalidate` 웹훅 허용)를 설정. 유지할 것.
- `tsconfig.json` 은 `astro/tsconfigs/strict` 확장, `exclude: ["dist","cms"]`(cms 는 별도 런타임). `npm run check` 0 errors 유지.

## Architecture

- **콘텐츠 흐름:** `index.astro` frontmatter가 `loadHomePageData()`(SWR 캐시)로 Directus 콘텐츠를 조회해 각 섹션 컴포넌트에 **props 로 분배**한다. 컴포넌트는 Directus 를 모르고 정규화된 문자열/URL 만 받는다. **콘텐츠 변경은 Directus 관리자에서** 한다 — 컴포넌트 코드에 콘텐츠 배열은 없다.
- **`src/lib/directus/`** — 데이터 접근 계층. `client.ts`(SDK 싱글톤), `schema.ts`(컬렉션 raw 타입), `queries.ts`(`getHomePageData`/`loadHomePageData` + view 타입), `cache.ts`(TTL 30s SWR + `purge`), `assets.ts`(에셋 URL·변환 preset), `accent.ts`(**accent 키→`var(--aiia-*)` 브리지**), `html.ts`(`nl2br`). **컴포넌트에서 Directus 를 직접 import 하지 말 것** — 전부 이 계층 경유.
- **색상 규칙(중요):** 콘텐츠의 강조색은 hex 가 아니라 **accent 키**(드롭다운)로 저장되고 `accent.ts` 가 `var(--aiia-*)` 로 해석한다. 원시 hex 를 DB/props 에 넣지 말 것(다크모드·브랜드 규정 유지).
- **`src/pages/api/revalidate.ts`** — 시크릿 인증 POST 엔드포인트. Directus Flow(콘텐츠 변경)가 호출해 SWR 캐시를 `purge` → 게시 즉시 반영. 캐시가 없거나 Directus 장애 시 `loadHomePageData` 가 마지막 정상본(stale-if-error)을 서빙.
- **`src/pages/`** — `index.astro` 는 데이터 로드 + `<Base>` 안에서 섹션을 순서대로 조합(`UtilityBar → Header → Hero → About → Stats → Centers → Members → News → Inquiry → Contact → Footer`).
- **`src/layouts/Base.astro`** — 페이지 셸(폰트, `global.css`, SEO/OG props, FOUC 방지 테마 초기화 스크립트). `title/description/ogImage` 는 `index.astro` 가 `site_settings` 에서 넣는다. **동결.**
- **`src/components/`** — 섹션당 `.astro` 하나 + `ThemeToggle`. 마크업·scoped `<style>` 는 유지, frontmatter 는 `const { x } = Astro.props`. 미디어(사진/썸네일/OG)가 없으면 기존 `.placeholder-chip`(또는 accent 배경) 유지. `UtilityBar` 는 정적 chrome.
- **`src/styles/global.css` / `aiia-tokens.css`** — 전역 스타일 진입점 + 디자인 토큰. 공유 primitive(`.section*`, `.card`, `.btn*`, `.tag*`, `.grid`, `.placeholder-chip*` …)는 여기. **동결.** CSS 는 여기 외 어디서도 import 하지 않는다.
- **`cms/`** — Directus 정의(버전관리): `schema/snapshot.yaml`(모델 정본), `schema/build-schema.mjs`(모델 저작 스크립트), `seed/seed.mjs`(권한·역할·더미유저·콘텐츠), `seed/revalidate-flow.mjs`(게시 즉시 반영 Flow). 런타임 산출물(`node_modules`/`data.db`/`uploads`/`.env`)은 gitignore.
- **`infra/`** — 배포 인프라(env 예시 등, 대학 서버 배포는 `docs/BACKLOG.md` 로 미룸). **`public/`** — 루트 정적 에셋(예: `/brand/aiia-symbol.png`).

**섹션/콘텐츠 유형을 추가할 때:** ① Directus 에 컬렉션/필드 추가(`build-schema.mjs` 수정 후 재생성 또는 Studio) → **`npm run schema:snapshot` 으로 `snapshot.yaml` 갱신·커밋** + 필요 시 `seed.mjs`·Public/Editor 권한·`revalidate-flow.mjs` collections 갱신, ② `src/lib/directus/`(`schema.ts` 타입 + `queries.ts` view/매핑, accent 는 `accent.ts`, 파일은 `assets.ts`), ③ `src/components/<Name>.astro`(props + 마크업 + scoped style), ④ `index.astro` 조합에 추가. 스타일은 2번째 컴포넌트가 쓸 때만 `global.css` 로 승격.

## Conventions (important)

- **Never hardcode colors, spacing, radius, or timing.** Always use `--aiia-*` tokens (e.g. `background: var(--aiia-primary)`, `padding: var(--aiia-space-4)`). Adding a new raw hex/px value where a token exists is a mistake.
- **Build UI against the *semantic* theme tokens** (`--aiia-bg`, `--aiia-surface`, `--aiia-surface-2`, `--aiia-ink`, `--aiia-ink-soft`, `--aiia-line`, `--aiia-primary`, `--aiia-on-primary`, …), **not** the raw brand colors (`--aiia-blue`, `--aiia-gold`, …). Semantic tokens are redefined for dark mode, so using them makes dark mode "just work"; using raw brand colors breaks it.
- **Theme system**: light/dark is driven by `data-theme` on `<html>`, persisted in `localStorage` under key **`aiia-theme`**. Dark also auto-applies via `prefers-color-scheme` when no explicit `data-theme` is set. `ThemeToggle.astro` toggles this and must stay in sync with the init script in `Base.astro` (same key, same `dataset.theme` mechanism).
- **Fonts**: `--aiia-font-sans` (Nanum Gothic) for Korean/body; `--aiia-font-display` (Space Grotesk) for Latin display text, numbers, and labels; `--aiia-font-mono` for mono.
- Brand palette follows Ajou University UI guidelines: AJOU BLUE `#005BAC` (primary), AJOU GOLD `#B08D3E` (secondary), plus AJOU SKY/YELLOW/SILVER subs — defined once in `aiia-tokens.css`; reference them, don't redefine.
