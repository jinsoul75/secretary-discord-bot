import { askPlannerAI } from './ai.js';
import {
  addGoogleCalendarAllDayEvent,
  listGoogleCalendarEventsByDate
} from './google-calendar.js';
import {
  addTodo,
  listTodos,
  completeTodo,
  linkTodoToGoal,
  addSchedule,
  listSchedules,
  addGoal,
  listGoals,
  listOpenTodosByGoal,
  listOpenTodosByDueDate,
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

function formatDaySummary({ date, calendarLines, todoLines }) {
  return [
    `일정 요약 (${date})`,
    '',
    'Google Calendar',
    ...(calendarLines.length ? calendarLines : ['- 일정 없음']),
    '',
    'TODO',
    ...(todoLines.length ? todoLines : ['- 해당 날짜 마감 TODO 없음'])
  ].join('\n');
}

function getDatePartsInTimeZone(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return { year, month, day };
}

function getISOWeekKeyInTimeZone(timeZone) {
  const { year, month, day } = getDatePartsInTimeZone(timeZone);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isoDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - isoDay);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${weekYear}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKeyInTimeZone(timeZone) {
  const { year, month } = getDatePartsInTimeZone(timeZone);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getCurrentGoalKey(scope, timeZone) {
  return scope === 'week'
    ? getISOWeekKeyInTimeZone(timeZone)
    : getMonthKeyInTimeZone(timeZone);
}

function isValidGoalKey(scope, key) {
  if (scope === 'week') {
    return /^\d{4}-W\d{2}$/.test(key);
  }
  if (scope === 'month') {
    return /^\d{4}-\d{2}$/.test(key);
  }
  return false;
}

export async function handleApplicationCommand(interaction, env) {
  const name = interaction.data.name;
  const options = interaction.data.options ?? [];
  const plannerTimeZone = env.PLANNER_TIMEZONE || 'Asia/Seoul';

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
      const goalTag = todo.goalScope && todo.goalKey ? ` [${todo.goalScope}:${todo.goalKey}]` : '';
      return `- [${todo.id}] (${status}) ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}${goalTag}`;
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

  if (name === 'gcal_add') {
    const date = getOptionValue(options, 'date');
    const summary = getOptionValue(options, 'summary');
    const description = getOptionValue(options, 'description') ?? '';

    if (!date || !isValidDateInput(date)) {
      return textResponse('date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
    }
    if (!summary) {
      return textResponse('summary는 필수입니다.', true);
    }

    try {
      const event = await addGoogleCalendarAllDayEvent({
        date,
        summary,
        description,
        env
      });
      return textResponse(`Google Calendar 추가 완료: ${event.summary || summary} (${date})`);
    } catch (error) {
      return textResponse(`Google Calendar 추가 실패: ${error.message}`, true);
    }
  }

  if (name === 'gcal_list') {
    const date = getOptionValue(options, 'date');
    if (!date || !isValidDateInput(date)) {
      return textResponse('date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
    }

    try {
      const { lines } = await listGoogleCalendarEventsByDate({ date, env });
      if (!lines.length) {
        return textResponse(`${date} Google Calendar 일정이 없습니다.`);
      }
      return textResponse(`Google Calendar 일정 (${date}):\n${lines.join('\n')}`);
    } catch (error) {
      return textResponse(`Google Calendar 조회 실패: ${error.message}`, true);
    }
  }

  if (name === 'day_summary') {
    const date = getOptionValue(options, 'date');
    if (!date || !isValidDateInput(date)) {
      return textResponse('date는 YYYY-MM-DD 형식이어야 합니다. 예: 2026-03-05', true);
    }

    const todos = await listOpenTodosByDueDate(date);
    const todoLines = todos.map((todo) => `- [${todo.id}] ${todo.title}`);

    try {
      const { lines } = await listGoogleCalendarEventsByDate({ date, env });
      return textResponse(formatDaySummary({
        date,
        calendarLines: lines,
        todoLines
      }));
    } catch (error) {
      return textResponse(
        formatDaySummary({
          date,
          calendarLines: [`- Google Calendar 조회 실패: ${error.message}`],
          todoLines
        }),
        true
      );
    }
  }

  if (name === 'goal_add') {
    const scope = getOptionValue(options, 'scope');
    const title = getOptionValue(options, 'title');
    const description = getOptionValue(options, 'description') ?? '';
    const inputKey = getOptionValue(options, 'key');

    const key = inputKey || getCurrentGoalKey(scope, plannerTimeZone);
    if (!isValidGoalKey(scope, key)) {
      return textResponse(
        scope === 'week'
          ? 'week key 형식은 YYYY-Www 입니다. 예: 2026-W10'
          : 'month key 형식은 YYYY-MM 입니다. 예: 2026-03',
        true
      );
    }

    const { goal, created } = await addGoal(scope, key, title, description);
    return textResponse(
      created
        ? `목표 등록 완료: [${goal.id}] ${scope}:${key} - ${title}`
        : `이미 같은 목표가 있어요: [${goal.id}] ${scope}:${key} - ${title}`
    );
  }

  if (name === 'goal_list') {
    const scope = getOptionValue(options, 'scope') ?? null;
    const key = getOptionValue(options, 'key') ?? null;

    if (scope && key && !isValidGoalKey(scope, key)) {
      return textResponse(
        scope === 'week'
          ? 'week key 형식은 YYYY-Www 입니다. 예: 2026-W10'
          : 'month key 형식은 YYYY-MM 입니다. 예: 2026-03',
        true
      );
    }

    const goals = await listGoals({ scope, key });
    if (!goals.length) {
      return textResponse('등록된 목표가 없습니다.');
    }

    const lines = goals.map((goal) => `- [${goal.id}] ${goal.scope}:${goal.key} | ${goal.title}${goal.description ? ` - ${goal.description}` : ''}`);
    return textResponse(`목표 목록:\n${lines.join('\n')}`);
  }

  if (name === 'todo_link') {
    const id = Number(getOptionValue(options, 'id'));
    const scope = getOptionValue(options, 'scope');
    const inputKey = getOptionValue(options, 'key');
    const key = inputKey || getCurrentGoalKey(scope, plannerTimeZone);

    if (!isValidGoalKey(scope, key)) {
      return textResponse(
        scope === 'week'
          ? 'week key 형식은 YYYY-Www 입니다. 예: 2026-W10'
          : 'month key 형식은 YYYY-MM 입니다. 예: 2026-03',
        true
      );
    }

    const result = await linkTodoToGoal(id, scope, key);
    if (!result.ok) {
      if (result.reason === 'TODO_NOT_FOUND') {
        return textResponse(`id=${id} TODO를 찾지 못했습니다.`, true);
      }
      if (result.reason === 'GOAL_NOT_FOUND') {
        return textResponse(`${scope}:${key} 목표가 없습니다. 먼저 /goal_add 로 등록해 주세요.`, true);
      }
    }

    return textResponse(`TODO 연결 완료: [${result.todo.id}] -> ${scope}:${key}`);
  }

  if (name === 'today') {
    const weekKey = getCurrentGoalKey('week', plannerTimeZone);
    const monthKey = getCurrentGoalKey('month', plannerTimeZone);

    const [weekGoals, monthGoals, weekTodos, monthTodos] = await Promise.all([
      listGoals({ scope: 'week', key: weekKey }),
      listGoals({ scope: 'month', key: monthKey }),
      listOpenTodosByGoal('week', weekKey),
      listOpenTodosByGoal('month', monthKey)
    ]);

    const sortTodos = (items) => [...items].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.id - b.id;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const weekTodoLines = sortTodos(weekTodos).map((todo) =>
      `- [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`
    );
    const monthTodoLines = sortTodos(monthTodos).map((todo) =>
      `- [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`
    );

    const weekGoalLines = weekGoals.length
      ? weekGoals.map((goal) => `- ${goal.title}`)
      : ['- (등록된 주간 목표 없음)'];
    const monthGoalLines = monthGoals.length
      ? monthGoals.map((goal) => `- ${goal.title}`)
      : ['- (등록된 월간 목표 없음)'];

    const message = [
      `오늘 추천 (${plannerTimeZone})`,
      '',
      `이번 주 목표 (${weekKey})`,
      ...weekGoalLines,
      '',
      '이번 주 관련 TODO',
      ...(weekTodoLines.length ? weekTodoLines : ['- (연결된 TODO 없음)']),
      '',
      `이번 달 목표 (${monthKey})`,
      ...monthGoalLines,
      '',
      '이번 달 관련 TODO',
      ...(monthTodoLines.length ? monthTodoLines : ['- (연결된 TODO 없음)']),
      '',
      '팁: TODO를 목표에 연결하려면 /todo_link 사용'
    ].join('\n');

    return textResponse(message);
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
