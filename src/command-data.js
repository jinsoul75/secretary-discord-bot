import { SlashCommandBuilder } from 'discord.js';

export const commandData = [
  new SlashCommandBuilder()
    .setName('add')
    .setDescription('TODO 또는 일정을 추가합니다')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('추가할 항목 유형')
        .setRequired(true)
        .addChoices(
          { name: 'todo', value: 'todo' },
          { name: 'schedule', value: 'schedule' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('TODO 제목 (type=todo일 때 사용)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('due')
        .setDescription('TODO 마감일 (YYYY-MM-DD, 선택)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('일정 날짜 (YYYY-MM-DD, type=schedule)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('content')
        .setDescription('일정 내용 (type=schedule)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('todo_list')
    .setDescription('할 일 목록을 조회합니다'),
  new SlashCommandBuilder()
    .setName('todo_done')
    .setDescription('할 일을 완료 처리합니다')
    .addIntegerOption((option) =>
      option
        .setName('id')
        .setDescription('완료할 TODO id')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('schedule_list')
    .setDescription('일정 목록을 조회합니다')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('특정 날짜만 조회 (예: 2026-03-05)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('gcal_add')
    .setDescription('Google Calendar에 종일 일정을 추가합니다')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('날짜 (예: 2026-03-05)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('summary')
        .setDescription('일정 제목')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('일정 설명')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('gcal_list')
    .setDescription('Google Calendar 일정과 TODO를 함께 조회')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('날짜 (예: 2026-03-05)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('day_summary')
    .setDescription('특정 날짜의 Google Calendar 일정과 TODO를 함께 조회합니다')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('날짜 (예: 2026-03-05)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('goal_add')
    .setDescription('주간/월간 목표를 등록합니다')
    .addStringOption((option) =>
      option
        .setName('scope')
        .setDescription('목표 범위')
        .setRequired(true)
        .addChoices(
          { name: 'week', value: 'week' },
          { name: 'month', value: 'month' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('목표 제목')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('목표 설명')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('직접 지정 키 (week: YYYY-Www, month: YYYY-MM)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('goal_list')
    .setDescription('목표 목록 조회')
    .addStringOption((option) =>
      option
        .setName('scope')
        .setDescription('조회 범위')
        .setRequired(false)
        .addChoices(
          { name: 'week', value: 'week' },
          { name: 'month', value: 'month' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('조회 키 (예: 2026-W10 또는 2026-03)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('todo_link')
    .setDescription('TODO를 목표에 연결합니다')
    .addIntegerOption((option) =>
      option
        .setName('id')
        .setDescription('TODO id')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('scope')
        .setDescription('목표 범위')
        .setRequired(true)
        .addChoices(
          { name: 'week', value: 'week' },
          { name: 'month', value: 'month' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('목표 키 (미입력 시 현재 주/월)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('today')
    .setDescription('오늘 기준으로 이번 주/월 해야 할 TODO를 추천합니다'),
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('TODO/일정을 바탕으로 AI에게 질문합니다')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('예: 오늘 뭐부터 하면 좋을까?')
        .setRequired(true)
    )
].map((command) => command.toJSON());
