# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **아키텍처: 완전 정적(Astro SSG) + git 콘텐츠 + Decap CMS.** 콘텐츠는 하드코딩 배열도
> 외부 DB 도 아니라 **저장소 안 `src/content/`(Content Collections)** 에 있고, 각 섹션
> 컴포넌트는 `Astro.props` 로 데이터를 받는다. 편집자는 **`/admin`(Decap CMS, 한국어 UI)**
> 에서 폼으로 편집하며 저장 = 커밋 → CI 빌드 → 배포다. 공개 서빙에 필요한 것은 정적
> 파일뿐이다. 목표·데이터모델·수용기준은 `docs/PRD.md`(v2), 미룬 작업은 `docs/BACKLOG.md`.
> **디자인 시스템(토큰/`global.css`/`Base.astro`/공유 primitive)과 각 컴포넌트의 scoped
> `<style>`은 동결**한다.

## Project

Homepage for **AIIA — 아주대학교 인공지능연구원 (AI Institute of Ajou University)**.
An Astro **SSG** site whose content lives in git (`src/content/`, zod-validated Content
Collections) and is edited through **Decap CMS** (`/admin`, 정적 페이지). UI copy and code
comments are in Korean; the default `lang` is `ko` (Base.astro also supports `en`).

## Commands

- `npm install` — 의존성 설치 (루트 런타임 의존성은 `astro` 하나)
- `npm run dev` — dev 서버(핫리로드). 콘텐츠는 저장소 파일이므로 별도 백엔드 불필요.
- `npm run admin:local` — Decap 로컬 편집 프록시(`decap-server`). dev 서버와 함께 띄우면
  브라우저에서 `http://localhost:4321/admin/index.html` 로 관리 UI 를 로그인 없이 사용
  (로컬 파일을 직접 편집). ※ dev 서버는 디렉토리 인덱스를 안 열므로 `/admin/` 이 아니라
  `/admin/index.html` 로 접근. 빌드 산출물/운영에서는 `/admin` 으로 접근 가능.
- `npm run build` — `dist/` 로 정적 빌드 (콘텐츠 zod 검증 포함 — 잘못된 콘텐츠는 빌드 실패)
- `npm run preview` — 빌드 결과 로컬 서빙
- `npm run check` — `astro check` (0 errors 유지)

## Build tooling / versions

- **Astro 7 SSG**(`output` 기본값 static, 어댑터 없음) on **Node 22**(nvm, `.nvmrc`=22).
- `npm audit` **0 vulnerabilities 유지**. `yaml` override(GHSA-48c2-rrv3-qjmp)도 유지.
  Decap CMS 는 npm 의존성이 아니라 `/admin` 정적 페이지가 CDN 번들을 로드 — audit 표면에
  들어오지 않는다. `decap-server` 도 `npx` 실행이라 미설치.
- `astro.config.mjs` 는 `site: "https://aiia.ajou.ac.kr"`(canonical/OG) 유지. `GITHUB_PAGES`
  env 스위치는 임시 호스팅(GitHub Pages 서브패스) 전용 — CI 에서만 켠다.
- `tsconfig.json` 은 `astro/tsconfigs/strict` 확장. `npm run check` 0 errors 유지.

## Architecture

- **콘텐츠 흐름:** `index.astro` frontmatter 가 `loadHomePageData()`(`src/lib/content/queries.ts`)로
  Content Collections 를 조회해 각 섹션 컴포넌트에 **props 로 분배**한다. 컴포넌트는 콘텐츠
  저장 방식을 모르고 정규화된 문자열/URL 만 받는다. **콘텐츠 변경은 `/admin` 또는
  `src/content/` 파일 수정으로** 한다 — 컴포넌트 코드에 콘텐츠 배열은 없다.
- **`src/content/`** — 콘텐츠 정본. 싱글톤 7종은 flat JSON 파일(`site_settings.json`,
  `hero.json`, `about.json`, `organization.json`, `inquiry.json`, `contact.json`, `footer.json`),
  목록 5종은 폴더 (`nav_items/`, `stats/`, `centers/`, `members/`, `news/`)에 항목별 JSON. 목록 항목은
  `sort`(수동 정렬) + `status`(`published`/`draft` — draft 는 렌더 제외)를 갖는다.
- **`src/content.config.ts`** — 컬렉션 zod 스키마(빌드 타임 검증). accent 는
  `ACCENT_KEYS` enum — **원시 hex 는 스키마 단계에서 거부**된다.
  ⚠ **`public/admin/config.yml`(Decap 편집 폼)과 이중 정의** — 필드 추가/변경 시 반드시
  양쪽을 함께 갱신할 것.
- **`src/lib/content/`** — 데이터 접근 계층. `queries.ts`(`loadHomePageData` + view 타입 —
  컴포넌트가 props 타입으로 import), `accent.ts`(**accent 키→`var(--aiia-*)` 브리지**),
  `html.ts`(`nl2br`). **컴포넌트에서 `astro:content` 를 직접 import 하지 말 것** — 전부 이
  계층 경유.
- **색상 규칙(중요):** 콘텐츠의 강조색은 hex 가 아니라 **accent 키**(Decap 드롭다운)로
  저장되고 `accent.ts` 가 `var(--aiia-*)` 로 해석한다. 원시 hex 를 콘텐츠/props 에 넣지
  말 것(다크모드·브랜드 규정 유지).
- **`public/admin/`** — Decap CMS 관리 UI(`index.html` 로더 + `config.yml`). config 는
  콘텐츠 모델을 **한국어 라벨**로 미러링. 이미지 업로드는 `public/uploads/` →
  콘텐츠에 `/uploads/...` 경로로 기록. 운영 GitHub 로그인은 `backend.base_url` 에 OAuth
  릴레이 주소가 필요(로컬은 `local_backend` + `admin:local`).
- **`.github/workflows/`** — `deploy.yml`(main push → check → build → GitHub Pages 배포.
  빌드 실패 시 배포 생략 = 이전 버전 유지. 서브패스 보정은 산출물에서만), `ci.yml`(PR:
  audit/check/build 게이트).
- **`infra/oauth-relay/`** — 편집자 GitHub 로그인용 셀프호스트 OAuth 릴레이(의존성 0,
  스테이트리스). 설정 절차는 해당 README.
- **`src/pages/`** — `index.astro` 는 데이터 로드 + `<Base>` 안에서 섹션을 순서대로 조합
  (`UtilityBar → Header → Hero → About → Stats → Centers → Organization → Members → News → Inquiry → Contact → Footer`).
- **`src/layouts/Base.astro`** — 페이지 셸(폰트, `global.css`, SEO/OG props, FOUC 방지 테마
  초기화 스크립트). `title/description/ogImage` 는 `index.astro` 가 `site_settings` 에서
  넣는다. **동결.**
- **`src/components/`** — 섹션당 `.astro` 하나 + `ThemeToggle`. 마크업·scoped `<style>` 는
  유지, frontmatter 는 `const { x } = Astro.props`. 미디어(사진/썸네일/OG)가 없으면 기존
  `.placeholder-chip`(또는 accent 배경) 유지. `UtilityBar` 는 정적 chrome.
- **`src/styles/global.css` / `aiia-tokens.css`** — 전역 스타일 진입점 + 디자인 토큰. 공유
  primitive(`.section*`, `.card`, `.btn*`, `.tag*`, `.grid`, `.placeholder-chip*` …)는 여기.
  **동결.** CSS 는 여기 외 어디서도 import 하지 않는다.
- **`public/`** — 루트 정적 에셋(`/brand/*`, 업로드 미디어 `/uploads/*`, 관리 UI `/admin/*`).

**섹션/콘텐츠 유형을 추가할 때:** ① `src/content.config.ts` 에 zod 스키마 + `src/content/`
에 콘텐츠 파일, ② `public/admin/config.yml` 에 편집 폼(한국어 라벨, accent 는 드롭다운
유지), ③ `src/lib/content/queries.ts` 에 view 타입/매핑, ④ `src/components/<Name>.astro`
(props + 마크업 + scoped style), ⑤ `index.astro` 조합에 추가. 스타일은 2번째 컴포넌트가
쓸 때만 `global.css` 로 승격.

## Conventions (important)

- **Never hardcode colors, spacing, radius, or timing.** Always use `--aiia-*` tokens
  (e.g. `background: var(--aiia-primary)`, `padding: var(--aiia-space-4)`). Adding a new raw
  hex/px value where a token exists is a mistake.
- **Build UI against the *semantic* theme tokens** (`--aiia-bg`, `--aiia-surface`,
  `--aiia-surface-2`, `--aiia-ink`, `--aiia-ink-soft`, `--aiia-line`, `--aiia-primary`,
  `--aiia-on-primary`, …), **not** the raw brand colors (`--aiia-blue`, `--aiia-gold`, …).
  Semantic tokens are redefined for dark mode, so using them makes dark mode "just work";
  using raw brand colors breaks it.
- **Theme system**: light/dark is driven by `data-theme` on `<html>`, persisted in
  `localStorage` under key **`aiia-theme`**. Dark also auto-applies via
  `prefers-color-scheme` when no explicit `data-theme` is set. `ThemeToggle.astro` toggles
  this and must stay in sync with the init script in `Base.astro` (same key, same
  `dataset.theme` mechanism).
- **Fonts**: `--aiia-font-sans` (Nanum Gothic) for Korean/body; `--aiia-font-display`
  (Space Grotesk) for Latin display text, numbers, and labels; `--aiia-font-mono` for mono.
- Brand palette follows Ajou University UI guidelines: AJOU BLUE `#005BAC` (primary),
  AJOU GOLD `#B08D3E` (secondary), plus AJOU SKY/YELLOW/SILVER subs — defined once in
  `aiia-tokens.css`; reference them, don't redefine.
