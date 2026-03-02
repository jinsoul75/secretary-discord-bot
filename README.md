# personal-discord-bot (Vercel)

Discord Interactions(Webhook) 방식으로 동작하는 TODO/일정 AI 봇입니다.

## 명령어
- `/add type:<todo|schedule> ...`
- `/todo_list`
- `/todo_done`
- `/schedule_list`
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
4. Deploy
5. 배포 URL 확인 (예: `https://<project>.vercel.app`)
6. Discord Developer Portal -> `General Information` -> `Interactions Endpoint URL`에 아래 입력
- `https://<project>.vercel.app/api/interactions`
7. 저장 후 `npm run register:commands` 다시 실행

## 데이터 저장
- 운영(Vercel): `@vercel/kv` 사용
- 로컬 개발: `data/planner.json` fallback 사용

## 주의
- 기존 Gateway(`discord.js login`) 봇과 달리, Vercel 배포에선 프로세스 상시 실행이 필요 없습니다.
- 리마인더 같은 주기 작업은 Vercel Cron 또는 외부 스케줄러로 별도 구성해야 합니다.
