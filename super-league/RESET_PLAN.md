# SUPER LEAGUE — 새 앱 재구축 계획

## 안전 원칙
- 기존 저장소, 배포, Supabase 프로젝트를 자동으로 삭제하거나 초기화하지 않는다.
- 기존 Supabase의 `super_league_match_stats`에는 경기 기록 9개가 있다. 재구축 전 이 데이터를 내보내 백업한다.
- 기존 프로젝트에는 NFTA 관련 테이블/함수도 있으므로 SUPER LEAGUE 테이블만 삭제해도 다른 기능에 영향을 줄 수 있다.
- 관리자 변경은 서버의 HttpOnly Secure SameSite 세션 쿠키로 인증한다. 비밀번호/서명 비밀값/토큰을 코드나 브라우저에 저장하지 않는다.

## 현재 확인 결과
- GitHub 저장소: `tajipan33-netizen/Fantasy-league-` (기존 SUPER LEAGUE 웹 파일이 있는 저장소)
- Vercel 프로젝트: `super-league`; 최근 Production 배포 READY지만 프로젝트 정보상 `live: false`, SSO 보호가 활성화되어 있음.
- Vercel API의 프로젝트 설정 접근은 현재 403 scope authorization 오류를 반환함.
- Supabase 프로젝트 `itytyqeemfbgfcaqqyoq`는 ACTIVE_HEALTHY.
- 공개 테이블 8개 중 `super_league_match_stats`에 9행, 나머지 SUPER LEAGUE 테이블은 0행.
- 보안 Advisor에서 기존 프로젝트의 NFTA 관련 SECURITY DEFINER 함수 공개 실행 경고와 leaked-password protection 경고가 발견됨. 별도 검토 필요.

## 새 앱 기능 범위
1. 대시보드: 다음 경기, 최근 결과, 순위 요약, 공지
2. 팀/선수단: 구단 프로필, 크레스트, 유니폼, 선수 포지션/번호/사진/상태
3. 경기 일정 및 결과: 라운드, 킥오프, 점수, 득점/도움/선방/MOM
4. 리그 순위: 경기수, 승/무/패, 득실차, 승점 자동 계산
5. 뉴스/공지, 이적시장, 스태프/유스, 팬 커뮤니티
6. 관리자 로그인: 인증된 사용자만 생성/수정/삭제
7. 데이터 내보내기/가져오기, 삭제 확인 절차, 감사 로그

## 구축·배포 절차
1. 새 GitHub 저장소 `super-league-app`을 만들거나 사용자가 지정한 새 저장소에 새 앱 파일을 커밋한다.
2. 별도 Supabase 프로젝트를 사용할 경우 조직/요금 확인 후 생성한다. 기존 프로젝트를 재사용할 경우 기존 데이터와 정책을 먼저 백업/검토한다.
3. 모든 노출된 테이블에 RLS 및 최소 권한 정책을 적용하고, SQL 변경 뒤 Security Advisor를 실행한다.
4. Vercel 프로젝트를 새 저장소에 연결하고 환경변수를 서버 전용/공개 키로 구분하여 설정한다.
5. 테스트 배포에서 로그인, CRUD 권한, 데이터 저장/재로드, 백업 복원, 모바일 화면을 검증한 뒤 공개 배포한다.

## 미완료/차단 사항
- 현재 연결 권한에서 Vercel 프로젝트 목록/상세 API가 403을 반환한다. 기존 프로젝트에 새 저장소 연결, 환경변수 설정, 배포는 아직 수행하지 못했다.
- GitHub connector에서 저장소 신규 생성 액션을 사용할 수 없어, 이 계획 파일을 기존 저장소에만 커밋했다. 이는 새 앱의 코드 완성이나 배포 완료를 의미하지 않는다.
