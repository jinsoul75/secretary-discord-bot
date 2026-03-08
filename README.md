# personal-discord-bot (Vercel)

Discord Interactions(Webhook) 방식으로 동작하는 TODO/목표 관리 AI 봇입니다.

## 명령어
- `/add type:<todo|schedule> ...`
- `/todo_list`
- `/todo_done`
- `/schedule_list`
- `/goal_add`
- `/goal_list`
- `/todo_link`
- `/today`
- `/gcal_add date:<YYYY-MM-DD> summary:<제목> description:<선택>`
- `/gcal_list date:<YYYY-MM-DD>`
- `/day_summary date:<YYYY-MM-DD>`
- `/ask`

## 아침 7시 리마인드 + 명언
- `vercel.json`의 Cron이 `/api/cron-reminder`를 매일 실행합니다.
- 스케줄 `0 22 * * *`는 KST 오전 7시입니다.
- 전송 내용:
  - 오늘 마감 TODO
  - 오늘 일정
  - 이번 주/월 목표 연결 TODO
  - 랜덤 명언 1개

필수 환경변수:
- `REMINDER_CHANNEL_ID`
- `REMINDER_TIMEZONE` (기본 `Asia/Seoul`)
- `CRON_SECRET` (권장)

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
- `REMINDER_CHANNEL_ID`, `REMINDER_TIMEZONE`, `CRON_SECRET`
4. Deploy
5. `Interactions Endpoint URL` 설정
- `https://<project>.vercel.app/api/interactions`

## Google Calendar 연결 (서비스 계정)
1. Google Cloud에서 서비스 계정 생성
2. 서비스 계정 키(JSON) 발급
3. 아래 값을 환경변수에 입력
- `GCAL_SERVICE_ACCOUNT_EMAIL`: JSON의 `client_email`
- `GCAL_PRIVATE_KEY`: JSON의 `private_key` (`\n` 형태)
- `GCAL_CALENDAR_ID`: 연결할 캘린더 ID
4. Google Calendar 공유 설정에서 서비스 계정 이메일에 캘린더 권한(수정자 이상) 부여

## 데이터 저장
- 운영(Vercel): `@vercel/kv` 사용
- 로컬 개발: `data/planner.json` fallback 사용
