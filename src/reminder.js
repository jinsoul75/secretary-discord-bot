import fs from 'node:fs';
import path from 'node:path';
import { listSchedules, listTodos } from './storage.js';

const reminderStateFile = path.resolve('data', 'reminder-state.json');

function ensureReminderStateFile() {
  const dir = path.dirname(reminderStateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(reminderStateFile)) {
    fs.writeFileSync(reminderStateFile, JSON.stringify({ sentDates: [] }, null, 2), 'utf-8');
  }
}

function readReminderState() {
  ensureReminderStateFile();
  return JSON.parse(fs.readFileSync(reminderStateFile, 'utf-8'));
}

function writeReminderState(state) {
  fs.writeFileSync(reminderStateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function getHourMinuteInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? -1);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? -1);
  return { hour, minute };
}

function buildReminderMessage(today, dueTodos, todaySchedules) {
  const todoText = dueTodos.length
    ? dueTodos.map((todo) => `- [${todo.id}] ${todo.title}`).join('\n')
    : '- 없음';

  const scheduleText = todaySchedules.length
    ? todaySchedules.map((item) => `- [${item.id}] ${item.content}`).join('\n')
    : '- 없음';

  return [
    `오늘 리마인드 (${today})`,
    '',
    '오늘 마감 TODO',
    todoText,
    '',
    '오늘 일정',
    scheduleText
  ].join('\n');
}

export function startReminderJob(client, options) {
  const {
    channelId,
    timeZone = 'Asia/Seoul',
    reminderHour = 9,
    reminderMinute = 0
  } = options;

  if (!channelId) {
    console.log('REMINDER_CHANNEL_ID가 없어 리마인더를 비활성화합니다.');
    return;
  }

  const tick = async () => {
    try {
      const now = new Date();
      const today = formatDateInTimeZone(now, timeZone);
      const { hour, minute } = getHourMinuteInTimeZone(now, timeZone);

      if (hour !== reminderHour || minute !== reminderMinute) {
        return;
      }

      const state = readReminderState();
      if (state.sentDates.includes(today)) {
        return;
      }

      const dueTodos = (await listTodos()).filter((todo) => !todo.done && todo.dueDate === today);
      const todaySchedules = await listSchedules(today);

      if (!dueTodos.length && !todaySchedules.length) {
        state.sentDates.push(today);
        writeReminderState(state);
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`리마인더 채널을 찾지 못했거나 텍스트 채널이 아닙니다: ${channelId}`);
        return;
      }

      const message = buildReminderMessage(today, dueTodos, todaySchedules);
      await channel.send(message);

      state.sentDates.push(today);
      writeReminderState(state);
      console.log(`리마인드 전송 완료: ${today}`);
    } catch (error) {
      console.error('리마인드 전송 오류:', error);
    }
  };

  tick();
  setInterval(tick, 30 * 1000);
  console.log(`리마인더 시작: ${timeZone} ${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`);
}
