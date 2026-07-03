#!/usr/bin/env bash
# docs/BACKLOG.md 항목을 GitHub Issues 로 일괄 등록한다 (1회용 — 실행 후 삭제 가능).
# 요구: gh CLI 설치 + 로그인(gh auth login), aii-ajou/aiia-home 쓰기 권한.
set -euo pipefail
REPO=aii-ajou/aiia-home

# 라벨 준비 (이미 있으면 무시)
while IFS=: read -r name color; do
  gh label create "$name" --color "$color" -R "$REPO" 2>/dev/null || true
done <<'EOF'
deploy:0052CC
infra:5319E7
auth:D93F0B
i18n:0E8A16
enhancement:A2EEEF
dx:BFD4F2
EOF

new_issue() { # $1=title $2=labels(콤마) $3=body
  gh issue create -R "$REPO" --title "$1" --label "$2" --body "$3"
}

new_issue "대학 서버 배포 (정적 파일 + nginx)" "deploy,infra" "$(cat <<'EOF'
- nginx 정적 서빙(+대학 에지 TLS), Actions → rsync 배포 계정/키 발급.
- `deploy.yml` 의 GitHub Pages 잡을 rsync 스텝으로 교체, `GITHUB_PAGES` 스위치 제거(서브패스 보정 불필요).

**수용 기준:** aiia.ajou.ac.kr HTTPS 공개, 편집 저장→5분 내 반영, 서버에 Node/DB 없음.
(참조: docs/PRD.md §10, .github/workflows/deploy.yml 주석)
EOF
)"

new_issue "편집자 GitHub 로그인 개통 — OAuth 릴레이 배치" "auth,infra" "$(cat <<'EOF'
릴레이는 구현 완료(`infra/oauth-relay/`, 의존성 0) — **배치만 남음**.

- [ ] 조직 OAuth App 생성 (callback: `https://<릴레이>/callback`)
- [ ] 릴레이 배치: 대학 서버 경로(nginx location) 또는 Cloudflare Worker(sveltia-cms-auth)
- [ ] `public/admin/config.yml` 의 `backend.base_url` 기입
- [ ] 편집자 GitHub 계정 생성·collaborator 초대(관리자 대행)

**수용 기준:** 편집자가 운영 `/admin` 에서 GitHub 로그인 → 폼 편집 → 수 분 내 사이트 반영.
(절차: infra/oauth-relay/README.md)
EOF
)"

new_issue "영문(EN) 버전" "i18n,enhancement" "$(cat <<'EOF'
- Astro i18n 라우팅(`/en/`) + 콘텐츠 `_ko/_en` 필드 확장, `Base.astro` `lang="en"` 스위칭.

**수용 기준:** 편집자가 EN 콘텐츠를 별도 관리, 공개 EN 페이지 렌더.
EOF
)"

new_issue "소식 상세 페이지 (/news/[slug])" "enhancement" "$(cat <<'EOF'
- `news` 의 `body`(markdown) 렌더 라우트, 목록 카드 → 상세 링크, PDF 첨부.

**수용 기준:** 편집자가 본문/첨부를 올리면 상세 페이지에 표시.
EOF
)"

new_issue "협력문의 폼 제출 백엔드" "enhancement" "$(cat <<'EOF'
- 현재 폼은 장식(`onsubmit="return false"`). 제출 처리(대학 메일 릴레이용 초소형
  스테이트리스 엔드포인트 또는 외부 폼 서비스) + 스팸 방지(honeypot/rate limit).

**수용 기준:** 제출이 담당자에게 전달·기록, 공개 사이트의 정적성 유지.
EOF
)"

new_issue "업로드 이미지 최적화 — astro:assets 검토" "enhancement,dx" "$(cat <<'EOF'
- 현재 업로드 미디어는 `public/uploads/` 원본 그대로 서빙. 이미지가 쌓이기 시작하면
  `image()` 스키마 + 빌드 타임 webp/리사이즈 전환 검토(PRD §5 원안).

**수용 기준:** 구성원 사진/썸네일이 최적화 포맷으로 서빙, 편집자 플로우 불변.
EOF
)"

new_issue "초안→승인 게시 워크플로 (optional)" "enhancement" "$(cat <<'EOF'
- Decap editorial workflow(PR 기반 draft→review→publish). 인프라 추가 없음. 다인 편집 조직이 되면 도입.
EOF
)"

new_issue "Sveltia CMS 전환 검토 (한국어 로케일 출시 시)" "dx" "$(cat <<'EOF'
- Sveltia 가 ko UI 로케일을 출시하면 `/admin` 로더 스크립트 교체(Decap 설정 호환)로 이전.
- https://github.com/sveltia/sveltia-cms
EOF
)"

new_issue "프로젝트 하네스 — skills" "dx" "$(cat <<'EOF'
- `add-content-type`(zod 스키마 + Decap config + 컴포넌트 동시 갱신 가이드), `deploy-univ` 등.
EOF
)"

echo "✓ 등록 완료 — gh issue list -R $REPO 로 확인"
