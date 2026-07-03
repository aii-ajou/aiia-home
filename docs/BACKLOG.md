# 백로그 — 추후 처리 (GitHub Issues 후보)

이 문서는 v2(정적 아키텍처, `docs/PRD.md`) 범위에서 **의도적으로 미룬** 작업의 드래프트다.
각 항목은 그대로 GitHub Issue 로 등록할 수 있도록 제목/본문/라벨을 갖춘다.

> v1(Directus) 시절 항목 중 **소멸**된 것: 아주대 SSO 연동(편집자 인증이 GitHub 기반으로
> 대체), 백업 자동화(git 이 콘텐츠 원본+이력), Postgres/볼륨 운영. v1 백로그 전문은 git 이력 참조.

---

## 1. 대학 서버 배포 (deploy)
**라벨:** `deploy`, `infra`, `deferred`
**차단 사유:** 학교 서버 환경 정보(도메인/프록시/배포 계정) 미확보 — 단, v2 요구사항은
nginx 정적 서빙뿐이라 v1 대비 크게 간소화됨.

- nginx 정적 서빙 설정(+TLS 는 대학 에지에서 종단).
- GitHub Actions → 서버 rsync 배포 계정/키 발급.
- OAuth 릴레이 배치(nginx 뒤 경로 하나 또는 무료 워커).
- 서버 준비 전 임시 정적 호스팅으로 선공개 여부 결정.
- **수용 기준:** HTTPS 공개, 편집자 저장→5분 내 반영, 서버에 Node/DB 없음.

## 2. 영문(EN) 버전 (i18n)
**라벨:** `i18n`, `enhancement`, `deferred`
- Astro i18n 라우팅(`/en/`) + 콘텐츠 `_ko/_en` 필드 확장(모델은 이미 i18n 친화).
- `Base.astro` `lang="en"` 스위칭.
- **수용 기준:** 편집자가 EN 콘텐츠를 별도 관리, 공개 EN 페이지 렌더.

## 3. 소식 상세 페이지 (feature)
**라벨:** `enhancement`, `deferred`
- `/news/[slug]` 라우트 — content collections 의 markdown `body` 렌더(빌드 타임, sanitize 불필요).
- 목록 카드 → 상세 링크, PDF 첨부.
- **수용 기준:** 편집자가 본문/첨부를 올리면 상세 페이지에 표시.

## 4. 협력문의 폼 백엔드 (feature)
**라벨:** `enhancement`, `deferred`
- 제출 처리: 대학 메일 릴레이로 전달하는 초소형 스테이트리스 엔드포인트(또는 외부 폼 서비스).
  현재 폼은 장식(`onsubmit="return false"`).
- 스팸 방지(honeypot/rate limit).
- **수용 기준:** 제출이 담당자에게 전달되고 기록됨. 공개 사이트의 정적성 유지.

## 5. 초안→승인 게시 워크플로 (feature, optional)
**라벨:** `enhancement`, `deferred`
- Decap editorial workflow(PR 기반 draft→review→publish). 인프라 추가 없음.
- 다인 편집 조직이 되면 도입.

## 6. Sveltia CMS 전환 검토 (dx, optional)
**라벨:** `dx`, `deferred`
- Sveltia 가 한국어 UI 로케일을 출시하면 `/admin` 스크립트 교체(설정 호환)로 이전.
- **수용 기준:** 편집자 플로우 동일 유지, UI 개선.

## 7. 프로젝트 하네스 — agents/skills (dx)
**라벨:** `dx`, `deferred`
- 전용 skill: `add-content-type`(zod 스키마+Decap config+컴포넌트 동시 갱신), `deploy-univ`.
- 재구축 안정화 후 생성.
