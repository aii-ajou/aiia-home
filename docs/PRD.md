# PRD — AIIA 홈페이지 정적 아키텍처 재구축 (v2)

**제품:** 아주대학교 인공지능연구원(AIIA, AI Institute of Ajou University) 홈페이지
**버전:** v2 (정적 회귀 재설계) — v1(Directus+SSR, 2026-07-01)을 대체. v1 전문은 git 이력 참조.
**작성일:** 2026-07-03
**상태:** 방향 승인됨 · 구현 착수 전
**관련 문서:** `CLAUDE.md`(구현 완료 후 갱신), `docs/BACKLOG.md`

---

## 1. 배경 — 왜 v1(Directus+SSR)을 폐기하는가

v1 은 "비전문 교직원이 코드 없이 편집"이라는 목표를 위해 Directus(self-host)+Astro SSR 를
구축했고 로컬에서 완전히 동작했다. 그러나 배포 전 재검토에서 다음이 확인됐다:

1. **라이선스 리스크.** Directus 12(2026-05)부터 BSL → MSCL 로 전환되며 기술적 강제
   (등록 키/entitlement)가 도입됐다. 무료 Core 티어는 필터 규칙 권한(우리의
   `status=published` 공개 읽기)이 차단되고, 전 기능 무료인 Open Innovation Grant 는
   "연 매출 $5M 미만 + 50인 미만" 법인 기준이라 대학은 대상이 아닐 가능성이 높다.
2. **운영 비용의 불균형.** 사이트의 실체는 랜딩 페이지 1장 + 콘텐츠 11종 + 월 수 회
   편집이다. 이를 위해 Node SSR + Directus + Postgres + 업로드 볼륨 + 야간 백업 +
   캐시 무효화 파이프라인 + Admin 보안을 대학 서버에서 상시 운영하는 것은 과도하다.
   v1 리스크 표의 과반이 "백엔드가 살아있어야 한다"에서 파생된 리스크였다.
3. **즉시 게시(~1초)는 자체 부과 요구사항.** 연구원 홈페이지에서 게시 반영이 1초냐
   수 분이냐는 실질 차이가 없다. 이 요구를 "수 분 내"로 완화하면 상시 백엔드가
   불필요해진다.

## 2. 목표 (Goals)

1. **권한 있는 교직원이 git/GitHub 지식 없이, 웹 관리 화면에서 폼 입력으로 콘텐츠를
   편집·업로드하고 수 분 내 게시**할 수 있게 한다. (v1 목표 1 유지, 반영 시간만 완화)
2. 현재의 **디자인 시스템과 화면(레이아웃·색·다크모드·타이포)을 픽셀 단위로 유지**한다.
3. **리치 미디어**(구성원 사진, 소식 썸네일, 브랜드/OG 이미지)를 지원한다.
4. **공개 사이트는 순수 정적 파일**로 산출한다 — 대학 서버 요구사항은 nginx 뿐.
5. **모든 콘텐츠 변경 이력이 git 에 영구 기록**되고, 임의 시점 롤백이 가능하다.
6. 오픈소스(MIT 등) 구성요소만 사용해 **라이선스 리스크를 제거**한다.

## 3. 비목표 (Non-Goals, v2 범위 제외)

- 영문(EN) 버전 — Astro i18n 라우팅으로 후속 확장 (백로그).
- 소식 상세 페이지(`/news/[slug]`) — content collections 의 body 필드로 확장 여지만 유지 (백로그).
- 협력문의 폼 제출 백엔드 — v1 과 동일하게 별도 논의 (백로그).
- 초안→승인 워크플로 — Decap editorial workflow 로 후속 도입 가능 (백로그).
- 아주대 SSO — 편집자 인증이 GitHub 계정 기반으로 바뀌므로 요구 자체가 소멸.

## 4. 사용자 & 이해관계자

| 역할 | 설명 | 필요 |
|---|---|---|
| **편집자(교직원)** | 비전문 사용자 1~3명 | 한국어 폼 UI, git 개념 노출 0, 저장→수 분 내 반영 |
| **관리자(기술)** | 초기 설정·계정·배포 담당 | 재현 가능한 설정, 이력/롤백, 최소 운영 부담 |
| **방문자** | 일반 공개 사용자 | 빠르고 절대 죽지 않는 정적 사이트, 다크모드 |

## 5. 확정된 제품 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 렌더링 | **Astro SSG** (`output: 'static'`, 어댑터 제거) | 공개 사이트를 정적 파일로 — 서버 런타임·장애 모드 제거 |
| 콘텐츠 저장소 | **git 저장소 내 `src/content/`** (Astro Content Collections, zod 스키마) | 이력·롤백·백업이 git 으로 공짜, 타입 안전 |
| 편집 UI | **Decap CMS** (MIT, 정적 `/admin` 페이지) | **한국어 UI 로케일 보유(확인됨)** — 비전문 교직원 요구의 결정 기준. 폼 위젯(select/image/datetime/list)로 전 콘텐츠 유형 커버 |
| 편집 UI 이중화 | 설정은 **Decap 호환 포맷** 유지 | Sveltia CMS(활발한 후속작, 현재 en/ja만)가 같은 설정을 읽는 drop-in — ko 지원 시 파일 교체로 이전 가능, 잠금 없음 |
| 편집자 인증 | GitHub 계정(저장소 collaborator) + **자체 호스팅 OAuth 릴레이**(스테이트리스 소형 서비스) | 편집자별 감사 이력. 릴레이는 DB/상태 없음 — 대학 서버 또는 무료 워커에 배치 |
| 빌드·배포 | **GitHub Actions**: push → `astro build` → 대학 서버로 rsync(또는 서버 준비 전 임시 정적 호스팅) | 게시 자동화, 빌드 실패 시 이전 버전 유지 |
| 이미지 | **`astro:assets`** 빌드 타임 변환(webp/리사이즈) | Directus 이미지 변환 대체, 결과물 정적 |
| accent 색 규율 | zod **enum**(`blue`,`gold`,…) + 기존 `accent.ts` 매핑 유지 | "DB/콘텐츠에 원시 hex 금지" 수용 기준 유지 |
| 품질 게이트 | `npm audit`=0, tsconfig strict, `astro check`=0, `astro build` green | 기존 규약 유지 |

## 6. 최우선 설계 제약 (디자인 시스템 보존 — v1 §6 전문 유지)

- **디자인 시스템 동결:** `src/styles/aiia-tokens.css`, `src/styles/global.css`,
  `src/layouts/Base.astro`, 공유 primitive, 각 컴포넌트 scoped `<style>` 은 수정하지 않는다.
- **컴포넌트는 이미 props 기반**(v1 산출물) — Directus 를 모르므로 **무수정 재사용**한다.
  바뀌는 것은 데이터 계층뿐: `src/lib/directus/` → content collections 로더.
- **색상은 hex 금지:** accent 키(zod enum) → `accent.ts` 가 `var(--aiia-*)` 로 해석.
- **미디어 미입력 시:** 기존 `.placeholder-chip` 유지.

## 7. 콘텐츠 모델 (v1 인벤토리 → Content Collections 매핑)

콘텐츠 유형과 필드는 v1 과 동일(검증된 모델). 저장 형태만 바뀐다.

| 유형 | v1 (Directus) | v2 (git) |
|---|---|---|
| 싱글톤 6종 (`site_settings`,`hero`,`about`,`inquiry`,`contact`,`footer`) | 싱글톤 컬렉션 | `src/content/<name>.json` 단일 파일 (`type: 'data'` 컬렉션 또는 파일 로더) |
| 목록 5종 (`nav_items`,`stats`,`centers`,`members`,`news`) | 컬렉션(행) | `src/content/<name>/*.md|json` 항목 파일. `sort` 필드로 수동 정렬, `status`(`published`/`draft`) 유지 — draft 는 빌드에서 제외 |
| 파일(사진/썸네일/OG) | `directus_files` | 저장소 내 이미지 + `astro:assets` (frontmatter 에 상대 경로) |
| accent | 고정 드롭다운 | zod enum + Decap `select` 위젯 (동일 선택지) |

Decap `config.yml` 이 위 스키마를 **한국어 라벨과 함께** 미러링한다(컬렉션명·필드
라벨·안내문 전부 한국어). zod 스키마와 Decap 설정의 이중 정의가 어긋나지 않도록
필드 추가 절차를 문서화한다(§11).

## 8. 아키텍처

```
방문자 ── HTTPS ──▶ nginx(대학 서버) ──▶ 정적 파일(dist/)          ← 서버 런타임 없음
편집자 ── HTTPS ──▶ /admin (Decap CMS, 정적 페이지, 한국어 UI)
                       │  GitHub OAuth (소형 스테이트리스 릴레이)
                       ▼
                    GitHub 저장소 (src/content/* 커밋 = 콘텐츠 + 전체 이력)
                       │  push 트리거
                       ▼
                    GitHub Actions: astro build → 검증 → rsync → 대학 서버
                    (빌드 실패 시 배포 생략 — 사이트는 이전 버전 그대로)
```

- **데이터 접근 계층:** `src/lib/content/` 가 content collections 를 조회해 v1 과 동일한
  view-ready 타입(`HomePageData` 등)으로 정규화. **컴포넌트 인터페이스 불변.**
  `cache.ts`/`revalidate` 엔드포인트/Flow 는 폐기(정적이라 불필요).
- **`astro.config.mjs`:** `output` 기본(static)으로 회귀, `@astrojs/node` 어댑터 제거,
  `security.checkOrigin` 해제(웹훅 소멸), `astro:env` 는 잔존 필요 변수만.

## 9. 인증 & 권한

- **공개 사이트:** 인증 없음(정적).
- **편집자:** GitHub 계정(관리자가 생성·저장소 collaborator 초대, 1회) → `/admin` 에서
  "GitHub 로 로그인" 1회 연결 후 자동. 편집자는 github.com 을 직접 쓰지 않는다.
- **감사 이력:** 모든 편집이 편집자 명의의 커밋으로 기록.
- **OAuth 릴레이:** 토큰 교환만 하는 스테이트리스 서비스(수십 줄). 대학 서버(nginx 뒤
  경로 하나) 또는 무료 워커에 배치. DB·세션·백업 없음.

## 10. 배포 & 운영

- **로컬 개발:** `npm run dev` 만으로 완결(별도 CMS 런타임 불필요). Decap 은 로컬
  백엔드 모드(`decap-server`)로 관리 UI 까지 로컬 검증 가능.
- **대학 서버:** nginx 정적 서빙 + OAuth 릴레이 1개. TLS 는 대학 에지. **DB·Node
  런타임·백업 시스템 불필요.** 서버 준비 전에는 임시 정적 호스팅으로 즉시 공개 가능.
- **백업:** git 자체가 콘텐츠 원본+이력. 저장소 미러 외 추가 백업 불필요.
- **재현성:** 콘텐츠·스키마·CMS 설정·CI 전부 저장소 안. "클릭 전용 설정 금지" 유지.

## 11. 마일스톤

각 단계 게이트: `npm audit`=0 · `astro check`=0 · `astro build` green.

0. **PRD v2 + 백로그 개편** — 본 문서.
1. **콘텐츠 이전** — `cms/seed/seed.mjs` 의 시드 콘텐츠를 `src/content/` 파일로 변환
   (스크립트로 기계 변환), zod 스키마 정의(accent enum 포함).
2. **데이터 계층 교체 + SSG 회귀** — `src/lib/content/` 신설(view 타입 유지),
   `index.astro` 전환, `output:'static'`, 어댑터/캐시/revalidate 제거.
3. **시각 회귀 검증** — 라이트/다크 픽셀 diff 로 v1 렌더와 동일 확인.
4. **관리 UI** — Decap `/admin`(한국어 라벨 config), 로컬 백엔드 모드로 편집 e2e 검증.
5. **CI/CD** — GitHub Actions 빌드+배포 워크플로, OAuth 릴레이, 빌드 실패 알림.
6. **정리** — `cms/`·`@directus/sdk`·`src/lib/directus/` 제거, `CLAUDE.md`·README 갱신.

## 12. 수용 기준 (Acceptance Criteria)

- [ ] 비전문 편집자가 `/admin` 한국어 폼 UI 에서 전 콘텐츠 유형을 git 노출 없이
      추가·수정·삭제·정렬·게시할 수 있다.
- [ ] 편집자가 이미지를 업로드해 구성원 사진·소식 썸네일·OG 이미지로 쓸 수 있다.
- [ ] 저장 후 공개 사이트에 **5분 내** 반영된다.
- [ ] 재구축된 사이트가 v1 과 **라이트/다크 모두 픽셀 동일**하다.
- [ ] 공개 서빙에 필요한 것이 **정적 파일 + nginx 뿐**이다.
- [ ] 모든 콘텐츠 변경이 편집자 명의 커밋으로 기록되고 임의 시점 롤백이 가능하다.
- [ ] 빌드 실패 시 사이트가 이전 버전을 계속 서빙하고 관리자에게 알림이 간다.
- [ ] `npm audit`=0, `astro check`=0, `astro build` green.
- [ ] 콘텐츠에 원시 hex 색상 값이 저장되지 않는다(accent 는 enum 키만).

## 13. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| Decap 프로젝트 유지보수 둔화 | 설정을 Decap 호환 포맷으로 유지 → Sveltia(활발한 후속작) drop-in 이전 경로 확보 |
| zod 스키마 ↔ Decap config 이중 정의 드리프트 | 필드 추가 절차 문서화 + CI 에서 시드 콘텐츠 스키마 검증 |
| 편집자 GitHub 계정 거부감 | 관리자가 계정 생성·초대까지 대행, 편집자는 /admin 로그인 1회 |
| OAuth 릴레이 운영 | 스테이트리스 수십 줄 — 장애 시에도 공개 사이트 무영향(편집만 일시 불가) |
| 이미지로 저장소 비대화 | 업로드 가이드(크기 제한) + 필요 시 Git LFS 후속 검토 |
| 빌드 파이프라인 실패 | 배포 전 `astro check`/build 게이트, 실패 시 배포 생략+알림, 사이트 무영향 |

## 14. 향후 확장 (Future)

- 영문 버전(Astro i18n 라우팅 + `_ko/_en` 필드).
- 소식 상세(`/news/[slug]`, markdown body — content collections 의 기본기라 v1 보다 쉬움).
- 초안→승인 워크플로(Decap editorial workflow = PR 기반, 인프라 추가 없음).
- 협력문의 제출 백엔드(대학 메일 릴레이로 보내는 초소형 스테이트리스 엔드포인트).
- Sveltia CMS 로 관리 UI 업그레이드(ko 로케일 출시 시).
