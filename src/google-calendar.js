import { google } from 'googleapis';

function getNextDate(dateStr) {
  const base = new Date(`${dateStr}T00:00:00Z`);
  const next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

function getCalendarClient(env) {
  const email = env.GCAL_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = env.GCAL_PRIVATE_KEY;
  const calendarId = env.GCAL_CALENDAR_ID;

  if (!email || !privateKeyRaw || !calendarId) {
    throw new Error('Google Calendar 설정이 없습니다. GCAL_SERVICE_ACCOUNT_EMAIL, GCAL_PRIVATE_KEY, GCAL_CALENDAR_ID를 설정하세요.');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  return {
    calendar: google.calendar({ version: 'v3', auth }),
    calendarId
  };
}

function formatDateTime(value, timeZone) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function formatEvent(event, timeZone) {
  if (event.start?.date) {
    return `- ${event.start.date} (종일) | ${event.summary || '(제목 없음)'}`;
  }

  if (event.start?.dateTime) {
    const when = formatDateTime(event.start.dateTime, timeZone);
    return `- ${when} | ${event.summary || '(제목 없음)'}`;
  }

  return `- ${event.summary || '(제목 없음)'}`;
}

export async function addGoogleCalendarAllDayEvent({ date, summary, description = '', env }) {
  const { calendar, calendarId } = getCalendarClient(env);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { date },
      end: { date: getNextDate(date) }
    }
  });

  return response.data;
}

export async function listGoogleCalendarEventsByDate({ date, env }) {
  const { calendar, calendarId } = getCalendarClient(env);
  const timeZone = env.GCAL_TIMEZONE || 'Asia/Seoul';
  const offset = env.GCAL_TZ_OFFSET || '+09:00';
  const nextDate = getNextDate(date);

  const response = await calendar.events.list({
    calendarId,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: `${date}T00:00:00${offset}`,
    timeMax: `${nextDate}T00:00:00${offset}`,
    maxResults: 50
  });

  const items = response.data.items ?? [];
  return {
    items,
    lines: items.map((item) => formatEvent(item, timeZone))
  };
}
