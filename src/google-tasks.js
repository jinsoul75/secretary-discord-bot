import crypto from 'node:crypto';
import { google } from 'googleapis';

const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks.readonly';

function stripQuotes(value = '') {
  return value.replace(/^"|"$/g, '');
}

function getOauthConfig(env) {
  const clientId = stripQuotes(env.GOOGLE_CLIENT_ID || '');
  const clientSecret = stripQuotes(env.GOOGLE_CLIENT_SECRET || '');
  const redirectUri = stripQuotes(env.GOOGLE_REDIRECT_URI || '');

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Tasks OAuth 설정이 없습니다. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI를 설정하세요.');
  }

  return { clientId, clientSecret, redirectUri };
}

function getOAuthClient(env) {
  const { clientId, clientSecret, redirectUri } = getOauthConfig(env);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getDateStringInTimeZone(value, timeZone) {
  const date = new Date(value);
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

function formatTask(task, timeZone) {
  const dueText = task.due
    ? ` (${getDateStringInTimeZone(task.due, timeZone)})`
    : '';
  return `- ${task.title || '(제목 없음)'}${dueText}`;
}

function taskMatchesDate(task, targetDate, timeZone) {
  if (!task.due) {
    return false;
  }
  return getDateStringInTimeZone(task.due, timeZone) === targetDate;
}

export function isGoogleTasksConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

export function createGoogleTasksOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

export function buildGoogleTasksAuthUrl({ env, state }) {
  const client = getOAuthClient(env);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_TASKS_SCOPE],
    state
  });
}

export async function exchangeGoogleTasksCode({ env, code }) {
  const client = getOAuthClient(env);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function listGoogleTasksByDate({ env, tokens, date }) {
  const client = getOAuthClient(env);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const me = await oauth2.userinfo.get();
  const userEmail = me.data.email || '';

  const tasks = google.tasks({ version: 'v1', auth: client });
  const timeZone = env.GTASKS_TIMEZONE || 'Asia/Seoul';

  const taskListsResponse = await tasks.tasklists.list({ maxResults: 100 });
  const taskLists = taskListsResponse.data.items ?? [];

  const tasksByList = await Promise.all(taskLists.map(async (taskList) => {
    const response = await tasks.tasks.list({
      tasklist: taskList.id,
      showCompleted: false,
      showHidden: false,
      maxResults: 100
    });

    const items = (response.data.items ?? []).filter((task) => taskMatchesDate(task, date, timeZone));
    return {
      title: taskList.title || '(이름 없는 목록)',
      items
    };
  }));

  const nonEmptyLists = tasksByList.filter((entry) => entry.items.length > 0);
  const lines = nonEmptyLists.flatMap((entry) => [
    `- [${entry.title}]`,
    ...entry.items.map((task) => `  ${formatTask(task, timeZone).slice(2)}`)
  ]);

  return {
    userEmail,
    lines,
    taskLists: nonEmptyLists
  };
}
