import {
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import {
  addTodo,
  listTodos,
  completeTodo,
  addSchedule,
  listSchedules,
  getPlannerContext
} from './storage.js';
import { askPlannerAI } from './ai.js';

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
    .setName('schedule_add')
    .setDescription('일정을 추가합니다')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('날짜 (예: 2026-03-05)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('content')
        .setDescription('일정 내용')
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

export async function handleCommand(interaction, env) {
  const name = interaction.commandName;

  if (name === 'add') {
    const type = interaction.options.getString('type', true);
    const title = interaction.options.getString('title', false);
    const due = interaction.options.getString('due', false);
    const date = interaction.options.getString('date', false);
    const content = interaction.options.getString('content', false);

    if (type === 'todo') {
      if (!title) {
        await interaction.reply({
          content: 'type=todo 일 때는 title이 필요합니다.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      if (due && !isValidDateInput(due)) {
        await interaction.reply({
          content: 'due는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const todo = await addTodo(title, due);
      await interaction.reply(`TODO 추가 완료: [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`);
      return;
    }

    if (type === 'schedule') {
      if (!date || !content) {
        await interaction.reply({
          content: 'type=schedule 일 때는 date와 content가 필요합니다.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      if (!isValidDateInput(date)) {
        await interaction.reply({
          content: 'date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const schedule = await addSchedule(date, content);
      await interaction.reply(`일정 추가 완료: [${schedule.id}] ${schedule.date} - ${schedule.content}`);
      return;
    }

    await interaction.reply({
      content: 'type은 todo 또는 schedule만 가능합니다.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (name === 'todo_list') {
    const todos = await listTodos();
    if (!todos.length) {
      await interaction.reply('저장된 TODO가 없습니다.');
      return;
    }

    const lines = todos.map((todo) => {
      const status = todo.done ? 'DONE' : 'OPEN';
      return `- [${todo.id}] (${status}) ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`;
    });

    await interaction.reply(`TODO 목록:\n${lines.join('\n')}`);
    return;
  }

  if (name === 'todo_done') {
    const id = interaction.options.getInteger('id', true);
    const todo = await completeTodo(id);

    if (!todo) {
      await interaction.reply({
        content: `id=${id} TODO를 찾지 못했습니다.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply(`완료 처리: [${todo.id}] ${todo.title}`);
    return;
  }

  if (name === 'schedule_list') {
    const date = interaction.options.getString('date', false);

    if (date && !isValidDateInput(date)) {
      await interaction.reply({
        content: 'date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const schedules = await listSchedules(date);

    if (!schedules.length) {
      await interaction.reply(date ? `${date} 일정이 없습니다.` : '저장된 일정이 없습니다.');
      return;
    }

    const lines = schedules.map((item) => `- [${item.id}] ${item.date}: ${item.content}`);
    await interaction.reply(`일정 목록:\n${lines.join('\n')}`);
    return;
  }

  if (name === 'ask') {
    const question = interaction.options.getString('question', true);
    await interaction.deferReply();

    try {
      const answer = await askPlannerAI({
        question,
        context: await getPlannerContext(),
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL
      });

      await interaction.editReply(answer);
    } catch (error) {
      await interaction.editReply(`AI 응답 중 오류가 발생했습니다: ${error.message}`);
    }
  }
}
