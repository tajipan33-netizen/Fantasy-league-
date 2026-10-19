# SUPER LEAGUE 관리자 보안 설정

이 변경은 사이트의 공개 조회는 유지하면서 데이터 변경 요청(POST/PATCH/DELETE)을 관리자 로그인 세션이 있는 요청으로 제한합니다. 로그인 세션은 서버에서 서명하고 브라우저에는 HttpOnly/Secure/SameSite=Strict 쿠키로만 보관합니다.

## 1. Vercel 환경 변수 설정

Vercel → SUPER LEAGUE 프로젝트 → Settings → Environment Variables에서 **Production**에 다음 두 변수를 설정하세요. Preview에서도 테스트하려면 Preview 환경에도 설정합니다.

- `ADMIN_PASSWORD`: 본인이 새로 정한 강력하고 고유한 관리자 비밀번호
- `ADMIN_SESSION_SECRET`: 최소 32바이트의 무작위 비밀값. 비밀번호와 다르게 설정하세요.

두 값 모두 GitHub 코드, HTML, 채팅, 공개 문서에 넣지 마세요. 비밀값 생성 예시(로컬 컴퓨터 터미널):
```bash
openssl rand -base64 48
```
출력된 값을 `ADMIN_SESSION_SECRET`에 입력합니다. 이 명령은 값을 생성하는 예시이며, ChatGPT가 Vercel에 대신 설정한 것은 아닙니다.

## 2. 재배포

환경 변수를 저장한 뒤 Vercel에서 새 Production Deployment를 실행해야 합니다. 배포가 완료되기 전까지 라이브 사이트의 변경사항 반영 여부를 확정할 수 없습니다.

## 3. 관리자 로그인

배포 후 `https://super-league-six.vercel.app/admin-login.html` 에서 로그인합니다. 세션은 8시간 후 만료됩니다. 로그아웃 API는 `POST /api/admin-logout`입니다.

## 중요한 제한

- API의 데이터 변경은 로그인 세션 없이는 거부됩니다. 기존 페이지의 수정 기능은 로그인 쿠키가 있으면 같은 브라우저에서 작동해야 합니다.
- 이 설정은 사이트 페이지 자체를 비공개로 만들지는 않습니다. 팀/뉴스 등 공개 조회 페이지는 누구나 볼 수 있습니다.
- GitHub 저장소 쓰기 권한과 Vercel 프로젝트 접근 권한도 별도로 보호하세요. GitHub 토큰은 서버 환경 변수에만 보관합니다.
- 배포 후 로그인 및 실제 데이터 변경/거부 동작을 확인해야 완전한 검증이 됩니다.
