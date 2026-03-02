import { askPlannerAI } from './ai.js';
import {
  addTodo,
  listTodos,
  completeTodo,
  addSchedule,
  listSchedules,
  getPlannerContext
} from './storage.js';

const EPHEMERAL_FLAG = 64;

function textResponse(content, ephemeral = false) {
  return {
    type: 4,
    data: {
      content,
      ...(ephemeral ? { flags: EPHEMERAL_FLAG } : {})
    }
  };
}

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getOptionValue(options, name) {
  return options?.find((option) => option.name === name)?.value;
}

export async function handleApplicationCommand(interaction, env) {
  const name = interaction.data.name;
  const options = interaction.data.options ?? [];

  if (name === 'add') {
    const type = getOptionValue(options, 'type');
    const title = getOptionValue(options, 'title');
    const due = getOptionValue(options, 'due');
    const date = getOptionValue(options, 'date');
    const content = getOptionValue(options, 'content');

    if (type === 'todo') {
      if (!title) {
        return textResponse('type=todo 일 때는 title이 필요합니다.', true);
      }
      if (due && !isValidDateInput(due)) {
        return textResponse('due는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
      }

      const todo = await addTodo(title, due ?? null);
      return textResponse(`TODO 추가 완료: [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`);
    }

    if (type === 'schedule') {
      if (!date || !content) {
        return textResponse('type=schedule 일 때는 date와 content가 필요합니다.', true);
      }
      if (!isValidDateInput(date)) {
        return textResponse('date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
      }

      const schedule = await addSchedule(date, content);
      return textResponse(`일정 추가 완료: [${schedule.id}] ${schedule.date} - ${schedule.content}`);
    }

    return textResponse('type은 todo 또는 schedule만 가능합니다.', true);
  }

  if (name === 'todo_list') {
    const todos = await listTodos();
    if (!todos.length) {
      return textResponse('저장된 TODO가 없습니다.');
    }

    const lines = todos.map((todo) => {
      const status = todo.done ? 'DONE' : 'OPEN';
      return `- [${todo.id}] (${status}) ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`;
    });

    return textResponse(`TODO 목록:\n${lines.join('\n')}`);
  }

  if (name === 'todo_done') {
    const id = Number(getOptionValue(options, 'id'));
    const todo = await completeTodo(id);

    if (!todo) {
      return textResponse(`id=${id} TODO를 찾지 못했습니다.`, true);
    }

    return textResponse(`완료 처리: [${todo.id}] ${todo.title}`);
  }

  if (name === 'schedule_list') {
    const date = getOptionValue(options, 'date');

    if (date && !isValidDateInput(date)) {
      return textResponse('date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
    }

    const schedules = await listSchedules(date ?? null);

    if (!schedules.length) {
      return textResponse(date ? `${date} 일정이 없습니다.` : '저장된 일정이 없습니다.');
    }

    const lines = schedules.map((item) => `- [${item.id}] ${item.date}: ${item.content}`);
    return textResponse(`일정 목록:\n${lines.join('\n')}`);
  }

  if (name === 'ask') {
    const question = getOptionValue(options, 'question');

    try {
      const answer = await askPlannerAI({
        question,
        context: await getPlannerContext(),
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL || 'gemini-2.5-flash'
      });

      return textResponse(answer);
    } catch (error) {
      return textResponse(`AI 응답 중 오류가 발생했습니다: ${error.message}`, true);
    }
  }

  return textResponse(`지원하지 않는 명령어입니다: ${name}`, true);
}
