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
    .setName('ask')
    .setDescription('TODO/일정을 바탕으로 AI에게 질문합니다')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('예: 오늘 뭐부터 하면 좋을까?')
        .setRequired(true)
    )
].map((command) => command.toJSON());
