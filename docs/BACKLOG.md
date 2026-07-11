# 백로그 — 추후 처리 (GitHub Issues 후보)

v2(정적 아키텍처, `docs/PRD.md`) 재구축 완료 시점(2026-07-03) 기준으로 남은 작업.
**`scripts/register-issues.sh`(gh CLI 필요)를 실행하면 아래 항목이 그대로 Issues 로
등록된다** — 등록 후 이 문서는 이슈 링크로 대체하거나 삭제한다.

현재 상태: main = 정적 사이트 + git 콘텐츠 + `/admin`(Decap). **GitHub Pages 임시 배포
가동 중**(https://aii-ajou.github.io/aiia-home/, main push 마다 자동). 로컬 편집은
`npm run admin:local` 로 가능. 운영 편집자 로그인만 미개통(OAuth 릴레이 미배치).

---

## 1. 대학 서버 배포 (deploy, infra)
- nginx 정적 서빙(+대학 에지 TLS), Actions → rsync 배포 계정/키.
- `deploy.yml` 의 Pages 잡을 rsync 스텝으로 교체, `GITHUB_PAGES` 스위치 제거(서브패스 보정 불필요).
- **수용 기준:** aiia.ajou.ac.kr HTTPS 공개, 편집 저장→5분 내 반영, 서버에 Node/DB 없음.

## 2. 편집자 GitHub 로그인 개통 — OAuth 릴레이 배치 (auth, infra)
- 릴레이는 구현 완료(`infra/oauth-relay/`, 의존성 0) — **배치만 남음**(대학 서버 경로 또는 Cloudflare Worker).
- 조직 OAuth App 생성 → 릴레이 env 설정 → `public/admin/config.yml` `base_url` 기입.
- 편집자 GitHub 계정 생성·collaborator 초대(관리자 대행).
- **수용 기준:** 편집자가 운영 `/admin` 에서 GitHub 로그인 → 폼 편집 → 수 분 내 반영.

## 3. 영문(EN) 버전 (i18n, enhancement)
- Astro i18n 라우팅(`/en/`) + 콘텐츠 `_ko/_en` 필드 확장, `Base.astro` `lang="en"`.
- **수용 기준:** EN 콘텐츠 별도 관리, 공개 EN 페이지 렌더.

## 4. 소식 상세 페이지 (enhancement)
- `/news/[slug]` 라우트 — `body` 필드(markdown) 렌더, 목록 카드→상세 링크, PDF 첨부.
- **수용 기준:** 편집자가 본문/첨부를 올리면 상세 페이지에 표시.

## 5. 협력문의 폼 백엔드 (enhancement)
- 제출 처리(대학 메일 릴레이용 초소형 스테이트리스 엔드포인트 또는 외부 폼 서비스) + 스팸 방지.
  현재 폼은 장식(`onsubmit="return false"`).
- **수용 기준:** 제출이 담당자에게 전달·기록, 공개 사이트 정적성 유지.

## 6. 업로드 이미지 최적화 — astro:assets 검토 (enhancement, dx)
- 현재 업로드 미디어는 `public/uploads/` 원본 그대로 서빙. 이미지가 실제로 쌓이기 시작하면
  `image()` 스키마 + 빌드 타임 webp/리사이즈 전환 검토(PRD §5 의 원안).
- **수용 기준:** 구성원 사진/썸네일이 최적화 포맷으로 서빙, 편집자 플로우 불변.

## 7. 초안→승인 게시 워크플로 (enhancement, optional)
- Decap editorial workflow(PR 기반 draft→review→publish). 인프라 추가 없음. 다인 편집 시 도입.

## 8. Sveltia CMS 전환 검토 (dx, optional)
- Sveltia 가 한국어 UI 로케일을 출시하면 `/admin` 스크립트 교체(설정 호환)로 이전.

## 9. 프로젝트 하네스 — skills (dx)
- `add-content-type`(zod 스키마+Decap config+컴포넌트 동시 갱신), `deploy-univ` 등.

## 10. 초기 콘텐츠 실데이터 보완 (content)
2026-07-11 콘텐츠 실화(추진전략 PDF 기반) 후 남은 실데이터. `/admin` 폼으로 보완 가능.
- **연락처(`contact.json`):** 전화/이메일이 플레이스홀더(`031-219-0000` / `aiia@ajou.ac.kr`) → 실제 대표번호·이메일 확정 반영.
- **구성원:** 인공지능학과 전임교원 23명 반영 완료. **사진 미등록**(placeholder), **겸임·산학협력교원 미포함** → 추가.
- **조직도:** 원장(윤대균)·운영위원(최영준) 반영. 나머지 운영위원 인선 확정 시 조직도 폼에서 보완.
- **소식:** 개소식·TAIF 2026·AWC 2026·AI융합 워크숍 4건 반영. 이후 지속 업데이트.
- **수용 기준:** 확정 정보로 교체되고 contact 플레이스홀더가 제거된다.
