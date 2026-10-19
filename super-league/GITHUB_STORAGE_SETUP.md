# SUPER LEAGUE — GitHub + Vercel 저장소 설정

이 구조는 Supabase 대신 GitHub 저장소의 JSON 파일을 데이터 저장소로 사용하기 위한 서버리스 API입니다.

## Vercel 환경 변수 설정

Vercel 프로젝트 `super-league`의 Settings → Environment Variables에서 다음 값을 Production 및 Preview에 추가하세요.

- `GITHUB_TOKEN`: `tajipan33-netizen/Fantasy-league-` 저장소의 Contents 읽기/쓰기 권한이 있는 GitHub fine-grained personal access token. 토큰은 브라우저 코드나 저장소에 넣지 마세요.
- `SL_DATA_KEY`: 충분히 길고 추측하기 어려운 별도의 비밀 문자열. 데이터 저장 API의 쓰기 요청에서 `x-sl-data-key` 헤더로 전달합니다. `GITHUB_TOKEN`과 같은 값을 사용하지 마세요.

환경 변수를 추가/수정한 뒤에는 Vercel에서 재배포해야 적용됩니다.

## API

- `GET /api/store?collection=players`: 데이터 읽기
- `POST /api/store?collection=players`: 전체 배열 교체 (인증 필요)

허용 컬렉션: `players`, `community-posts`, `community-comments`, `news`, `transfers`, `team-profiles`, `staff-youth`, `match-stats`.

POST JSON 예시:

```json
{ "data": [{ "example": true }] }
```

헤더에 `x-sl-data-key: <SL_DATA_KEY 값>`를 포함해야 합니다. 저장될 때마다 GitHub에 새 커밋이 생성됩니다.

## 중요한 제한

- GitHub는 데이터베이스가 아니라 파일 저장소입니다. 빈번한 동시 수정이나 실시간 채팅에는 적합하지 않으며, 두 사용자가 동시에 저장하면 충돌할 수 있습니다.
- 이 API는 데이터 저장 기반을 제공하지만, 기존 HTML 페이지를 모두 이 API로 전환하는 작업은 별도입니다. 현재 페이지 일부는 여전히 기존 Supabase API를 직접 사용합니다.
- 뉴스/팀 프로필 이미지 업로드는 기존 Supabase Storage를 사용하므로, Supabase를 완전히 제거하려면 이미지 파일을 GitHub에 저장하거나 Vercel Blob 등 별도 저장소로 옮기는 변경도 필요합니다.
