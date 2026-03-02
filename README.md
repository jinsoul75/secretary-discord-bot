# personal-discord-bot (Vercel)

Discord Interactions(Webhook) 방식으로 동작하는 TODO/일정 AI 봇입니다.

## 명령어
- `/add type:<todo|schedule> ...`
- `/todo_list`
- `/todo_done`
- `/schedule_list`
- `/gcal_add date:<YYYY-MM-DD> summary:<제목> description:<선택>`
- `/gcal_list date:<YYYY-MM-DD>`
- `/ask`

## 로컬 준비
```bash
npm install
cp .env.example .env
```

## 명령어 등록
```bash
npm run register:commands
```

- `DISCORD_GUILD_ID`를 넣으면 길드 커맨드로 즉시 반영
- 없으면 글로벌 커맨드로 등록(반영 지연 가능)

## Vercel 배포 순서
1. GitHub에 푸시
2. Vercel에서 프로젝트 Import
3. Environment Variables 등록
- `DISCORD_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_PUBLIC_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (선택)
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (권장)
- `GCAL_SERVICE_ACCOUNT_EMAIL`, `GCAL_PRIVATE_KEY`, `GCAL_CALENDAR_ID`
- `GCAL_TIMEZONE`, `GCAL_TZ_OFFSET` (선택)
4. Deploy
5. 배포 URL 확인 (예: `https://<project>.vercel.app`)
6. Discord Developer Portal -> `General Information` -> `Interactions Endpoint URL`에 아래 입력
- `https://<project>.vercel.app/api/interactions`
7. 저장 후 `npm run register:commands` 다시 실행

## Google Calendar 연결 (서비스 계정)
1. Google Cloud에서 서비스 계정 생성
2. 서비스 계정 키(JSON) 발급
3. 아래 값을 환경변수에 입력
- `GCAL_SERVICE_ACCOUNT_EMAIL`: JSON의 `client_email`
- `GCAL_PRIVATE_KEY`: JSON의 `private_key` (줄바꿈은 `\n`로 넣기)
- `GCAL_CALENDAR_ID`: 연결할 캘린더 ID
4. Google Calendar 공유 설정에서 해당 서비스 계정 이메일에 캘린더 권한(수정자 이상) 부여

## 데이터 저장
- 운영(Vercel): `@vercel/kv` 사용
- 로컬 개발: `data/planner.json` fallback 사용

## 주의
- 기존 Gateway(`discord.js login`) 봇과 달리, Vercel 배포에선 프로세스 상시 실행이 필요 없습니다.
- 리마인더 같은 주기 작업은 Vercel Cron 또는 외부 스케줄러로 별도 구성해야 합니다.
