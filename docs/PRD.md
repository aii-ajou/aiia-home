# PRD — AIIA 홈페이지 CMS 기반 재구축

**제품:** 아주대학교 인공지능연구원(AIIA, AI Institute of Ajou University) 홈페이지
**버전:** v1 (재구축)
**작성일:** 2026-07-01
**상태:** 승인됨 · 구현 착수
**관련 문서:** 구현 계획 `/home/dkyoon/.claude/plans/glistening-sleeping-hummingbird.md`, `CLAUDE.md`

---

## 1. 배경 & 문제 정의

현재 `aiia-home`은 **정적(Static) Astro 사이트**이며, 홈페이지의 모든 콘텐츠 —
연구원 소개, 연구센터, 구성원, 소식, 통계, 협력문의, 연락처, 푸터 — 가 각 섹션
컴포넌트(`src/components/*.astro`)의 frontmatter에 **하드코딩된 JavaScript 배열**로
들어 있다.

그 결과:
- 콘텐츠 한 줄(예: 신임 교수 추가, 소식 게시)을 바꾸려면 **코드 수정 → 빌드 → 배포**가 필요하다.
- 비전문 교직원이 스스로 갱신할 수 없어, 개발자에게 의존하고 업데이트가 지연된다.
- 조직 개편·인사 변동·행사 공지 등 **자주 바뀌는 정보**가 최신 상태로 유지되기 어렵다.

## 2. 목표 (Goals)

1. **조직도·구성원·연구센터·프로젝트·소식·홍보 등 홈페이지의 거의 모든 콘텐츠를,
   권한 있는 교직원이 코드 수정 없이 관리자 화면에서 편집/업로드하고 즉시 게시**할 수 있게 한다.
2. 현재의 **디자인 시스템과 화면(레이아웃·색·다크모드·타이포)을 픽셀 단위로 유지**한다.
   변경되는 것은 콘텐츠의 *출처*뿐이다(하드코딩 배열 → CMS).
3. **리치 미디어**(구성원 사진, 소식 썸네일·PDF 첨부, 브랜드/OG 이미지)를 지원한다.
4. **로컬에서 완결적으로 개발·검증**한 뒤 대학 서버로 테스트 배포할 수 있는 경로를 갖춘다.
5. 향후 **아주대 SSO 연동**과 **영문 버전**으로 저비용 확장 가능한 구조를 남긴다.

## 3. 비목표 (Non-Goals, v1 범위 제외)

- **아주대 SSO 실제 연동** — 구조는 pluggable로 남기되, v1은 CMS 내장 인증 + 더미 계정으로 개발.
- **영문(EN) 콘텐츠 편집** — 데이터 모델은 i18n 친화적으로 두되, v1은 한국어만 편집.
- **초안→승인(draft→approval) 워크플로** — v1은 권한 있는 사용자가 즉시 게시.
- 협력문의 폼의 백엔드 처리(메일 발송/스팸 방지 등)의 고도화 — 폼 필드 구성은 CMS화하되, 제출 처리 파이프라인은 별도 논의.
- 검색, 다중 페이지 라우팅(상세 페이지) 등은 데이터 모델에 확장 여지(예: `news.slug`, `news.body`)만 두고 v1 화면에는 미노출.

## 4. 사용자 & 이해관계자

| 역할 | 설명 | 필요 |
|---|---|---|
| **편집자(교직원)** | 비전문 사용자. 콘텐츠 편집/게시 담당 | 쉽고 안전한 관리자 UI, 코드/git 불필요, 즉시 반영 |
| **관리자** | 초기 설정·계정·배포 담당(기술 인력) | 스키마 재현, 권한 관리, 배포/백업 |
| **방문자** | 일반 공개 사용자 | 빠르고 안정적인 공개 사이트, 다크모드 |

## 5. 확정된 제품 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 호스팅 | 아주대 서버(Node+DB, on-prem, self-host) | 데이터 주권, 대학 인프라 |
| CMS 엔진 | **Directus**(self-host, Postgres) | 완성형 Admin·RBAC·리치미디어/이미지 변환·REST+GraphQL을 코딩 없이 제공 → 비전문 편집자 적합, 관리자 UI 자체 개발 불필요 |
| 렌더링 | **Astro SSR**(`@astrojs/node`) | 요청 시 CMS 조회 + 캐시로 게시 **즉시 반영**, 재빌드 파이프라인 불필요 |
| 인증 | Directus 내장(더미 계정) → SSO는 env 설정만으로 후속 연결 | go-live가 SSO 준비에 묶이지 않게 |
| 게시 | 권한 사용자 즉시 publish | v1 단순화 |
| 다국어 | 한국어만 편집(모델은 i18n 친화) | 범위 관리 |
| 리치 미디어 | 지원 | 요구사항 |
| 품질 게이트 | `npm audit`=0, tsconfig strict, `astro check`=0, `astro build` green | 기존 저장소 규약 유지 |

## 6. 최우선 설계 제약 (디자인 시스템 보존)

- **디자인 시스템 동결:** `src/styles/aiia-tokens.css`, `src/styles/global.css`,
  `src/layouts/Base.astro`, 공유 primitive(`.section*`, `.card`, `.btn*`, `.tag*`, `.grid`,
  `.eyebrow*`, `.placeholder-chip*`), 각 컴포넌트의 scoped `<style>`은 **수정하지 않는다.**
- **컴포넌트 리팩터는 기계적:** `const centers = [...]` → `const { centers } = Astro.props;`.
  마크업·`.map()` 렌더 루프·클래스명·스타일 그대로.
- **색상은 hex 금지:** 현재 `color` 필드는 hex가 아니라 **디자인 토큰 참조**
  (`var(--aiia-blue)`, `var(--aiia-gold)` 등)다. CMS에서는 **accent 키의 고정 드롭다운**으로
  만들고 데이터 계층(`accent.ts`)에서 `키 → var(--aiia-*)`로 해석한다. **원시 hex가 DB에
  절대 저장되지 않는다** → 다크모드·아주 브랜드 규정 유지.
  - accent 키 집합: `blue`, `blue-deep`, `blue-bright`, `gold`, `success`, `warning`, `silver`
    (필요 시 `sky`, `yellow` 추가). 매핑 원본은 `aiia-tokens.css`의 `--aiia-*` 변수.
- **미디어 미입력 시:** 파일 필드가 비어 있으면 기존 `.placeholder-chip` 마크업을 유지 →
  콘텐츠를 채워가는 동안에도 시각적 회귀가 없다.

## 7. 콘텐츠 모델 (인벤토리 → Directus 매핑)

두 유형: **싱글톤**(1행, "single object") / **컬렉션**(N행, 정렬 가능). 파일은 Directus
`directus_files`에 M2O(단일)/M2M(다중)으로 연결하고, 이미지 변환은
`/assets/:id?width=…&format=webp&quality=…`로 무료 제공.

**공통 규약:** 모든 콘텐츠는 `status`(`published`/`draft`, Public role은 `published`만 read) +
`sort`(수동 정렬) + `date_updated`/`user_updated`를 갖는다. accent 필드는 위 고정 드롭다운.

### 싱글톤
| 컬렉션 | 매핑 대상 | 주요 필드 |
|---|---|---|
| `site_settings` | 사이트 전역·연락처·SNS·브랜드 | `site_title`, `site_description`, `og_image`(file), `favicon`(file), `brand_symbol`(file), `contact_address`, `contact_tel`, `contact_email`, `social_links`(JSON `[{label,url,icon}]`), `header_cta_label/href` |
| `hero` | Hero 섹션 | `eyebrow`, `title`(개행), `lede`, `cta_primary_label/href`, `cta_secondary_label/href`, `badge_number`, `badge_label`, `visual_image`(file, nullable) |
| `about` | About 섹션 | `eyebrow`, `title`, `lede` + `about_pillars`(O2M: `mono`, `accent`, `title`, `desc`, `sort`) |
| `inquiry` | 협력문의 섹션+폼 설정 | `eyebrow`, `title`, `lede`, `coop_modes`(JSON/O2M), `form_fields`(JSON repeater: label·type·options), `consent_label`, `submit_label` |
| `contact` | 오시는 길 | `eyebrow`, `title`, `items`(JSON `[{label,value}]`: Address/Tel/Email), `map_embed`(text, sanitize), `map_image`(file, nullable) |
| `footer` | 푸터 | `address_html`, `columns`(O2M `footer_columns` → `footer_links`: `label`,`href`,`sort`), `copyright`, `social_links` |

### 컬렉션
| 컬렉션 | 매핑 대상 | 주요 필드 |
|---|---|---|
| `nav_items` | GNB | `label`, `href`, `sort`, `status` |
| `stats` | 통계 | `value`(예 "130+"), `label`, `sort`, `status` |
| `centers` | 연구센터 | `mono`, `accent`, `name_ko`, `name_en`, `description`, `tag`, `detail_url`(nullable), `sort`, `status` |
| `members` | 구성원 | `name`, `role`, `area`, `accent`, `photo`(file, nullable), `bio`(nullable), `email`(nullable), `sort`, `status` |
| `news` | 소식 | `category`, `accent`, `date`, `title`, `body`(rich/markdown, nullable), `thumbnail`(file, nullable), `attachments`(M2M files, nullable), `slug`(unique), `sort`, `status` |

> 선택: `news_categories`(`name`, `accent`)로 카테고리→색 중앙화(권장, v1 필수 아님).
> i18n: v1은 Directus Translations 미사용. `centers.name_ko/name_en`처럼 명시적 `_ko/_en`
> 유지 → 후속 EN 확장 시 기계적 마이그레이션.

## 8. 아키텍처

```
방문자 ── HTTPS ──▶ Astro SSR(@astrojs/node) ──(SWR 캐시)──▶ Directus REST/SDK ──▶ Postgres
                              ▲                                     │
편집자 ── HTTPS ──▶ Directus Studio(Admin) ──(Flow 웹훅)──▶ /api/revalidate(캐시 퍼지)
                                                              파일/에셋 ── /assets (이미지 변환)
```

- **데이터 접근 계층**(`src/lib/directus/`): `@directus/sdk` 하나로 통일. `queries.ts`의
  `getHomePageData()`가 섹션별 쿼리를 `Promise.all` 병렬 조회 → accent는 CSS var로, 파일
  id는 URL로 정규화한 **view-ready** 형태 반환. **컴포넌트는 Directus를 모른다.**
- **게시 즉시 반영:** 짧은 TTL 인메모리 SWR 캐시 + Directus Flow가 콘텐츠 변경 시
  `/api/revalidate`(공유 시크릿)로 웹훅 → `cache.purge()`. 편집자 저장 후 1회 요청 내 반영.
- **복원력:** `stale-if-error`로 Directus 장애 시 마지막 정상본 서빙. 콜드 스타트+Directus
  다운 시 seed된 상수 fallback으로 500 방지.
- **저장소 구조:** Astro는 루트 유지(churn 최소·audit 표면=Astro만). Directus는 컨테이너/별도
  런타임(루트 `package-lock`에 미포함). `cms/`(스키마 스냅샷+seed), `infra/`(compose·env),
  `src/lib/directus/`(데이터 계층), `docs/`(문서), `.claude/`(하네스) 추가.

## 9. 인증 & 권한

- **공개 사이트는 익명 read**(Public role, `status=published`). v1 프론트엔드에 로그인 없음.
- **편집자 인증 = Directus 내장**(email/password), 더미 계정 seed. `Editor` role = 콘텐츠 CRUD +
  파일 업로드, 스키마/유저관리 권한 없음. 즉시 publish.
- **SSO = env 설정만**(Directus 네이티브 OpenID/OAuth2/SAML/LDAP). `.env.directus.example`에
  주석 처리된 provider 블록을 미리 문서화 → 아주 SSO 준비되면 **앱/스키마 코드 변경 0**.

## 10. 배포 & 운영

- **로컬:** Directus + Postgres + Astro(SSR)를 로컬에서 실행. 더미 계정/콘텐츠 seed.
  `cms:apply`(스키마) → `cms:seed`(콘텐츠) → 프론트 실행 → 편집→즉시 반영 확인.
- **대학 서버 테스트 배포:** 동일 토폴로지 + 실 env/시크릿, 리버스 프록시(nginx)+TLS(대학 에지),
  Postgres 볼륨/업로드 볼륨 영속화, **야간 백업**(`pg_dump` + 업로드 스냅샷, 오프박스 보관),
  schema apply + 운영 seed. Directus Admin은 내부/SSO 뒤로.
- **재현성:** 스키마는 `cms/schema/snapshot.yaml`로 버전관리(`directus schema apply`).
  콘텐츠/역할/유저는 멱등 `cms/seed/seed.mjs`. **클릭 전용 설정 금지.**

## 11. 마일스톤 (단계)

각 단계 종료 게이트: `npm audit`=0 · `astro check`=0 · `astro build` green + 단계별 검증.

0. **PRD + 스캐폴딩 + 하네스** — 본 문서, Node 어댑터, infra/cms/데이터계층 골격, `.claude/` 하네스.
1. **데이터 모델 + 재현 스키마** — Directus 모델 구축 → snapshot + 멱등 seed.
2. **데이터 접근 계층** — `getHomePageData()` 타입 안전·view-ready.
3. **컴포넌트 리팩터(스타일 동결)** — 섹션별 배열→props, 라이트/다크 시각 diff 게이트.
4. **캐시 + 즉시 게시 + 복원력** — SWR 캐시, revalidate 웹훅, stale-if-error.
5. **로컬 풀스택 스모크 + 하드닝** — 에셋/OG/사진/PDF, 비전문 편집자 e2e.
6. **대학 서버 테스트 배포** — 실 env, 프록시+TLS, 백업, SSO stub.

## 12. 수용 기준 (Acceptance Criteria)

- [ ] 비전문 편집자가 관리자 UI에서 **연구센터/구성원/소식/소개/통계/연락처/푸터/네비**를
      코드 없이 추가·수정·삭제·정렬·게시할 수 있다.
- [ ] 편집자가 **이미지/PDF를 업로드**해 구성원 사진·소식 썸네일·첨부·OG 이미지로 쓸 수 있다.
- [ ] 게시(저장) 후 공개 사이트에 **~1초 내 반영**된다(캐시 웹훅).
- [ ] 재구축된 공개 사이트가 기존과 **라이트/다크 모두 픽셀 동일**하다.
- [ ] Postgres 볼륨 삭제 후 `cms:apply && cms:seed`로 **모델·콘텐츠·더미계정이 완전 재현**된다.
- [ ] Directus 중단 시 사이트가 **마지막 정상본을 계속 서빙**하고, 재기동 시 자동 복구된다.
- [ ] 모든 단계에서 `npm audit`=0, `astro check`=0, `astro build` green 유지.
- [ ] DB에 원시 hex 색상 값이 저장되지 않는다(accent는 드롭다운 키만).

## 13. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| SSR↔Directus 가용성 결합 | SWR + stale-if-error, seed 상수 fallback, 동일 서버 공존, 헬스체크/자동 재기동 |
| 캐시 vs 즉시성 | 짧은 TTL + 웹훅 퍼지(웹훅 실패 시 TTL 폴백) |
| 이미지 파생물 남발 | `assets.ts` named preset 화이트리스트, 업로드 크기/타입 제한 |
| 콘텐츠가 git에 없음(백업) | go-live 전 야간 `pg_dump` + 업로드 볼륨 스냅샷, 복구 절차 문서화 |
| audit 0 유지 | 신규 deps는 `@astrojs/node`,`@directus/sdk`뿐(Directus는 별도 런타임), 추가 시마다 audit, `yaml` override 유지 |
| 디자인 시스템 훼손 | accent enum→`var(--aiia-*)`(hex 차단), 컴포넌트 `<style>` 무수정, 토큰/Base/primitive 수정 범위 밖, 시각 diff 게이트 |
| 리치텍스트/임베드 주입 | 렌더 시 sanitize, 원시 HTML 대신 마크다운, `map_embed`는 허용 provider URL 패턴만 |
| SSO 지연 | Directus 네이티브 provider(설정만), env 블록 사전 문서화, 내장 계정으로 go-live |

## 14. 향후 확장 (Future)

- 아주대 SSO 실제 연동(그룹→role 매핑).
- 영문 버전(Directus Translations 또는 `_ko/_en` 확장).
- 소식 상세 페이지(`/news/[slug]`, `news.body`), 구성원 상세, 검색.
- 초안→승인 게시 워크플로(다인 편집 조직 시).
- 협력문의 제출 백엔드(메일/스팸/저장).
