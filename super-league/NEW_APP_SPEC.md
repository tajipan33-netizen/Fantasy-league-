# SUPER LEAGUE — 신규 앱 재구축 청사진

## 현재 환경 조사
- GitHub: tajipan33-netizen/Fantasy-league- (기존 앱 코드 있음)
- Vercel: super-league (최근 배포 READY, 하지만 API 권한 오류 403을 확인함)
- Supabase: itytyqeemfbgfcaqqyoq (ACTIVE_HEALTHY)
- 기존 Supabase SUPER LEAGUE 테이블 중 super_league_match_stats에는 9행이 있으며, 나머지 7개 SUPER LEAGUE 테이블은 비어 있음.
- 기존 프로젝트에는 NFTA 테이블/함수도 포함되어 있어 프로젝트를 통째로 지우면 다른 기능도 영향 받을 수 있음.

## 제품 범위
- 홈 대시보드, 구단/선수단, 경기 일정/결과, 자동 순위표, 선수 통계, 뉴스/공지, 이적시장, 스태프/유스, 팬 커뮤니티, 관리자, 백업/복원.
- 모바일 우선 한국어 UI. 시각 디자인은 블랙/네이비 기반 + 골드 포인트.
- 선수단 및 경기 데이터는 중앙 DB에 저장하여 새로고침과 업데이트 후에도 보존.

## 핵심 규칙
- 기존 자료를 자동 삭제하지 않는다.
- 모든 노출 스키마 테이블에 RLS를 활성화하고 최소권한 정책을 만든다.
- 공개 사용자는 읽기 전용 공개 데이터를 볼 수 있게 하고, 모든 쓰기/수정/삭제는 관리자 서버 세션으로 보호한다.
- 클라이언트에는 publishable key만 사용. service_role/secret/token은 브라우저나 저장소에 저장하지 않는다.
- 대량 변경은 재확인 및 데이터 백업을 요구한다.
- DB 변경 후 Security Advisor와 실제 저장/재조회 테스트를 수행한다.

## 관리자 로그인 보완
기존 api/admin-login.js는 비밀번호만 확인하고 쿠키 세션을 설정하지 않던 상태였다. 2026-10-20 커밋에서 이 핸들러를 _admin-auth.js 세션 헬퍼를 사용하도록 보완했다. api/github-store.js의 POST/PATCH/DELETE 또한 verifySession 검증을 추가했다. 단, Vercel 권한 오류 때문에 배포 및 라이브 동작은 아직 검증되지 않았다.

## 미완료 단계
1. 새 저장소 super-league-app을 생성하거나 사용자가 지정한 새 저장소를 준비한다.
2. 앱 소스 전체를 새 저장소에 배치한다.
3. 별도 Supabase 프로젝트 생성 여부 결정 및 스키마/RLS 생성. 기존 DB를 재사용한다면 먼저 9개의 경기 기록을 백업한다.
4. Vercel 새 프로젝트를 Git 저장소에 연결하고 환경 변수를 안전하게 설정한다.
5. Preview에서 CRUD 권한과 데이터 보존을 테스트한다.
6. Production 배포를 완료하고 URL을 사용자에게 전달한다.

## 현재 차단
- GitHub 연결의 목록/파일/커밋 기능은 사용 가능하지만, 이 연결은 신규 저장소 생성 전용 액션을 제공하지 않는다.
- Vercel MCP의 프로젝트 상세/목록은 scope authorization 403을 반환한다. 기존 프로젝트 연결이나 환경변수 설정은 할 수 없다.
- 이 파일 및 관리자 API 보완은 신규 앱 전체 제작 또는 배포 완료를 뜻하지 않는다.
