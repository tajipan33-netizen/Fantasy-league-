# SUPER LEAGUE — GitHub + Vercel 저장소 설정

기존 Supabase 직접 호출을 대체하기 위해 Vercel 서버리스 API가 GitHub 저장소의 JSON 파일을 읽고 씁니다.

## Vercel 설정 — 꼭 필요

Vercel 프로젝트의 Settings → Environment Variables에서 Production 및 Preview에 다음 환경 변수를 추가하세요.

- `GITHUB_TOKEN`: GitHub fine-grained personal access token. Repository access를 `tajipan33-netizen/Fantasy-league-`로 제한하고 **Contents: Read and write** 권한만 부여하세요. 토큰은 이 저장소의 파일이나 브라우저 코드에 절대 넣지 마세요.

환경 변수를 저장한 뒤 Vercel에서 새 배포를 실행해야 합니다. 현재 Vercel 연결 권한이 없어 이 설정과 배포 상태를 제가 직접 확인할 수 없습니다.

## 데이터 API

기존 앱 페이지는 다음 컬렉션을 `/api/store?collection=...`로 사용합니다.

- `players`
- `community-posts`
- `community-comments`
- `news`
- `transfers`
- `team-profiles`
- `staff-youth`
- `match-stats`

GET은 Supabase REST API와 유사한 조회 필터를 지원합니다. POST/PATCH/DELETE는 해당 JSON 컬렉션을 수정하고 GitHub 커밋을 생성합니다.

## 제한 및 보안 안내

- GitHub는 데이터베이스가 아닌 파일 저장소입니다. 동시에 여러 명이 저장하면 충돌이 발생할 수 있고, 잦은 채팅/수정에 적합하지 않습니다.
- 이 API는 브라우저에서 사용할 수 있도록 공개 쓰기를 허용합니다. 따라서 공개된 사이트 이용자가 요청을 위조하거나 데이터를 변경할 수 있습니다. 경쟁 리그 운영의 중요한 데이터에는 별도 서버 인증/권한 검증을 추가하기 전까지 사용하지 마세요.
- 이미지 데이터는 일부 프로필/뉴스에서 JSON 안에 넣으므로 크기 제한이 있습니다.
- 기존 Supabase에 저장된 데이터는 아직 자동으로 가져오지 않았습니다. 이전 전에 Supabase 프로젝트에서 데이터를 내보내 백업하고, GitHub JSON으로 옮겨야 기존 기록을 보존할 수 있습니다.
