# SUPER LEAGUE APP — 기능 명세

## 제품 방향
한국어 우선, 모바일 우선 반응형 웹 앱. 어두운 경기장 톤, 블랙/네이비 패널, 골드 포인트 컬러. 기존 경기 기록과 선수 데이터는 자동으로 지우지 않는다.

## 화면
- `/`: 홈 대시보드와 최신 공지/경기
- `/teams`: 구단 목록 및 구단 프로필
- `/teams/[id]`: 구단 선수단 및 코치진
- `/players`: 선수 검색·필터 및 상세 정보
- `/fixtures`: 일정과 경기 결과
- `/standings`: 라운드 기준 승점 순위표
- `/stats`: 득점·도움·선방·MOM 리더보드
- `/news`: 뉴스/공지
- `/transfers`: 이적시장 및 협상 상태
- `/community`: 팬 게시글·댓글
- `/admin`: 관리자 인증 뒤에만 열리는 데이터 관리
- `/admin/backup`: JSON 내보내기/가져오기와 변경 이력

## 핵심 데이터 모델
- teams: id, name, crest_url, kit_url, main_sponsor, sleeve_sponsor, stadium_name, coach, notes
- players: id, team_id, name, shirt_number, positions[], age, nationality, photo_url, injury_status, availability, notes
- fixtures: id, season, round_number, kickoff_at, home_team_id, away_team_id, home_score, away_score, status, venue
- player_match_stats: id, fixture_id, team_id, player_id, goals, assists, saves, is_mom, minutes_played, cards
- news: id, title, category, body, image_url, published_at, author_id
- transfers: id, player_id, from_team_id, to_team_id, transfer_type, fee, currency, status, window, contract_until
- community_posts/comments: author, body, parent/post relation, timestamps, moderation status
- audit_log: actor, action, entity_type, entity_id, timestamp, safe change summary

## 보안 및 데이터 안정성 요구 사항
- 공개 사용자는 읽기 전용 공개 데이터만 조회할 수 있다.
- 생성·수정·삭제는 인증된 관리자 서버 세션으로 보호한다. admin role은 user-editable metadata로 판단하지 않는다.
- RLS는 공개 스키마 모든 테이블에 켜고 정확한 정책을 구성한다.
- 클라이언트에는 publishable key만 사용한다. service_role/secret key는 브라우저 코드, 저장소, 로그에 넣지 않는다.
- 모든 변경은 유효성 검사를 적용하고, 큰 변경/대량 삭제에는 재확인 및 감사 기록을 남긴다.
- 브라우저 localStorage 단독 저장은 영구 저장소로 취급하지 않는다.
- 가져오기 전 기존 데이터 백업, 가져오기 후 행 수 검증, 저장 후 재조회 테스트를 수행한다.

## 완료 조건
- 관리자 로그인과 비로그인 CRUD 거부가 검증됨
- 새 선수/경기 기록이 새로고침 후에도 보존됨
- 일정과 순위가 일관된 데이터로 계산됨
- 기존 경기 기록 내보내기 및 복원 절차가 문서화됨
- 모바일에서 주요 화면이 정상 작동함
- Vercel Production 배포가 READY이고 접근성/보안 정책을 검증함
