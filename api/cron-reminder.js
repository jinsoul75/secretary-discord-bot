import {
  listTodos,
  listSchedules,
  listGoals,
  listOpenTodosByGoal
} from '../src/storage.js';

const QUOTES = [
  '작은 진전도 진전이다.',
  '완벽보다 완수가 먼저다.',
  '오늘의 한 걸음이 내일의 방향을 만든다.',
  '기록하면 흐릿한 목표가 선명해진다.',
  '집중은 해야 할 일을 줄이는 데서 시작한다.'
];

function pickRandomQuote() {
  const index = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[index];
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

function getTodayDateInTimeZone(timeZone) {
  const { year, month, day } = getDatePartsInTimeZone(timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function truncateForDiscord(text) {
  const limit = 1900;
  return text.length > limit ? `${text.slice(0, limit)}\n...` : text;
}

function buildReminderMessage({
  timeZone,
  today,
  weekKey,
  monthKey,
  todayDueTodos,
  todaySchedules,
  weekGoals,
  monthGoals,
  weekGoalTodos,
  monthGoalTodos,
  quote
}) {
  const todoLines = todayDueTodos.length
    ? todayDueTodos.map((todo) => `- [${todo.id}] ${todo.title}`).join('\n')
    : '- 없음';

  const scheduleLines = todaySchedules.length
    ? todaySchedules.map((item) => `- [${item.id}] ${item.content}`).join('\n')
    : '- 없음';

  const weekGoalLines = weekGoals.length
    ? weekGoals.map((goal) => `- ${goal.title}`).join('\n')
    : '- 없음';

  const monthGoalLines = monthGoals.length
    ? monthGoals.map((goal) => `- ${goal.title}`).join('\n')
    : '- 없음';

  const weekTodoLines = weekGoalTodos.length
    ? weekGoalTodos.map((todo) => `- [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`).join('\n')
    : '- 없음';

  const monthTodoLines = monthGoalTodos.length
    ? monthGoalTodos.map((todo) => `- [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`).join('\n')
    : '- 없음';

  const message = [
    `좋은 아침입니다. 오늘 리마인드 (${today}, ${timeZone})`,
    '',
    '오늘 마감 TODO',
    todoLines,
    '',
    '오늘 일정',
    scheduleLines,
    '',
    `이번 주 목표 (${weekKey})`,
    weekGoalLines,
    '',
    '이번 주 목표 관련 미완료 TODO',
    weekTodoLines,
    '',
    `이번 달 목표 (${monthKey})`,
    monthGoalLines,
    '',
    '이번 달 목표 관련 미완료 TODO',
    monthTodoLines,
    '',
    `오늘의 한 줄: "${quote}"`
  ].join('\n');

  return truncateForDiscord(message);
}

async function sendDiscordMessage(channelId, token, content) {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord 전송 실패 (${response.status}): ${body}`);
  }
}

function isAuthorized(req, cronSecret) {
  if (!cronSecret) {
    return true;
  }

  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const {
    DISCORD_TOKEN,
    REMINDER_CHANNEL_ID,
    REMINDER_TIMEZONE = 'Asia/Seoul',
    CRON_SECRET
  } = process.env;

  if (!isAuthorized(req, CRON_SECRET)) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  if (!DISCORD_TOKEN || !REMINDER_CHANNEL_ID) {
    res.status(500).json({
      ok: false,
      error: 'DISCORD_TOKEN 또는 REMINDER_CHANNEL_ID가 설정되지 않았습니다.'
    });
    return;
  }

  try {
    const today = getTodayDateInTimeZone(REMINDER_TIMEZONE);
    const weekKey = getISOWeekKeyInTimeZone(REMINDER_TIMEZONE);
    const monthKey = getMonthKeyInTimeZone(REMINDER_TIMEZONE);

    const [todos, todaySchedules, weekGoals, monthGoals, weekGoalTodos, monthGoalTodos] = await Promise.all([
      listTodos(),
      listSchedules(today),
      listGoals({ scope: 'week', key: weekKey }),
      listGoals({ scope: 'month', key: monthKey }),
      listOpenTodosByGoal('week', weekKey),
      listOpenTodosByGoal('month', monthKey)
    ]);

    const todayDueTodos = todos.filter((todo) => !todo.done && todo.dueDate === today);
    const quote = pickRandomQuote();

    const message = buildReminderMessage({
      timeZone: REMINDER_TIMEZONE,
      today,
      weekKey,
      monthKey,
      todayDueTodos,
      todaySchedules,
      weekGoals,
      monthGoals,
      weekGoalTodos,
      monthGoalTodos,
      quote
    });

    await sendDiscordMessage(REMINDER_CHANNEL_ID, DISCORD_TOKEN, message);
    res.status(200).json({ ok: true, today, weekKey, monthKey });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
