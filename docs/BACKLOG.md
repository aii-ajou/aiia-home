# 백로그 — 추후 처리 (GitHub Issues 후보)

이 문서는 v1 로컬 구축 범위에서 **의도적으로 미룬** 작업의 드래프트다.
각 항목은 그대로 GitHub Issue 로 등록할 수 있도록 제목/본문/라벨을 갖춘다.
(현재 GitHub MCP 앱이 `aii-ajou` 조직 저장소에 접근 권한이 없어 자동 등록이 막혀 있음 —
권한이 부여되면 이 목록을 이슈로 옮긴다.)

---

## 1. 대학 서버 테스트 배포 (deploy)
**라벨:** `deploy`, `infra`, `deferred`
**차단 사유:** 학교 서버 환경 정보(OS/런타임/도메인/프록시/DB 정책) 미확보.

- Docker/Postgres 기반 운영 토폴로지(`infra/docker-compose.yml`) 확정.
- 리버스 프록시(nginx/대학 에지) 라우팅: 공개 → Astro SSR, `/cms`·`/assets`(또는 서브도메인) → Directus.
- TLS(대학 에지에서 종단), Directus Admin 은 내부/SSO 뒤로.
- Postgres 볼륨 + 업로드 볼륨 영속화, 헬스체크/자동 재기동.
- 최초 부팅 시 `schema apply` + 운영 seed(더미 계정 제외).
- **수용 기준:** HTTPS 공개, 편집자 로그인·게시, 데이터 on-prem.

## 2. 아주대 SSO 연동 (auth)
**라벨:** `auth`, `deferred`
- Directus 네이티브 provider(OpenID/OAuth2/SAML/LDAP)를 env 로 설정.
- SSO 그룹 → Directus `Editor` role 매핑.
- `infra/env/.env.directus.example` 의 주석 provider 블록을 실제 값으로.
- **수용 기준:** 아주 계정으로 로그인→편집 가능, 앱/스키마 코드 변경 0.

## 3. 영문(EN) 버전 (i18n)
**라벨:** `i18n`, `enhancement`, `deferred`
- Directus Translations 도입 또는 기존 `_ko/_en` 필드 확장.
- `Base.astro` `lang="en"` 라우팅/카피 스위칭.
- **수용 기준:** 편집자가 EN 콘텐츠를 별도로 관리, 공개 EN 페이지 렌더.

## 4. 소식 상세 페이지 (feature)
**라벨:** `enhancement`, `deferred`
- `/news/[slug]` 라우트, `news.body`(리치텍스트/마크다운) 렌더 + **sanitize**.
- 목록 카드 → 상세 링크.
- **수용 기준:** 편집자가 본문/첨부(PDF)를 올리면 상세 페이지에 안전하게 표시.

## 5. 협력문의 폼 백엔드 (feature)
**라벨:** `enhancement`, `deferred`
- 폼 제출 처리(메일 발송/DB 저장/스팸 방지). 폼 **필드 구성**은 v1 에서 CMS화 완료 예정,
  **제출 파이프라인**만 여기서 다룸.
- **수용 기준:** 제출이 담당자에게 전달되고 기록됨.

## 6. 백업 자동화 (ops)
**라벨:** `ops`, `deferred` (배포와 함께)
- 야간 `pg_dump` + 업로드 볼륨 스냅샷, 오프박스 보관, 복구 절차 문서화.
- **수용 기준:** 복구 리허설 통과. (콘텐츠가 git 에 없으므로 go-live 전 필수)

## 7. 초안→승인 게시 워크플로 (feature, optional)
**라벨:** `enhancement`, `deferred`
- 다인 편집 조직에서 필요 시 draft→review→publish 도입.

## 8. 프로젝트 하네스 — agents/skills (dx)
**라벨:** `dx`, `deferred`
- 전용 subagent: `directus-modeler`, `astro-section-refactor`, `data-layer`.
- 전용 skill: `cms:apply`/`cms:seed`, `add-content-type`, `deploy-univ`.
- 재구축 자체가 어느 정도 안정화된 뒤 `harness:harness` 로 생성.
