import fs from 'node:fs/promises';
import path from 'node:path';
import { kv } from '@vercel/kv';

const dataDir = process.env.VERCEL
  ? '/tmp/personal-discord-bot-data'
  : path.resolve('data');
const dataFile = path.join(dataDir, 'planner.json');
const kvKey = 'planner:store';

function initialStore() {
  return {
    nextTodoId: 1,
    nextScheduleId: 1,
    todos: [],
    schedules: []
  };
}

function canUseKV() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readStoreFromFile() {
  try {
    const content = await fs.readFile(dataFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initial = initialStore();
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(dataFile, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    throw error;
  }
}

async function writeStoreToFile(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

async function readStore() {
  if (canUseKV()) {
    const store = await kv.get(kvKey);
    if (store) {
      return store;
    }

    const initial = initialStore();
    await kv.set(kvKey, initial);
    return initial;
  }

  return readStoreFromFile();
}

async function writeStore(data) {
  if (canUseKV()) {
    await kv.set(kvKey, data);
    return;
  }

  await writeStoreToFile(data);
}

export async function addTodo(title, dueDate = null) {
  const store = await readStore();
  const todo = {
    id: store.nextTodoId++,
    title,
    dueDate,
    done: false,
    createdAt: new Date().toISOString()
  };

  store.todos.push(todo);
  await writeStore(store);
  return todo;
}

export async function listTodos() {
  const store = await readStore();
  return store.todos;
}

export async function completeTodo(id) {
  const store = await readStore();
  const todo = store.todos.find((item) => item.id === id);
  if (!todo) {
    return null;
  }

  todo.done = true;
  todo.completedAt = new Date().toISOString();
  await writeStore(store);
  return todo;
}

export async function addSchedule(date, content) {
  const store = await readStore();
  const schedule = {
    id: store.nextScheduleId++,
    date,
    content,
    createdAt: new Date().toISOString()
  };

  store.schedules.push(schedule);
  await writeStore(store);
  return schedule;
}

export async function listSchedules(date = null) {
  const store = await readStore();
  if (!date) {
    return store.schedules;
  }
  return store.schedules.filter((item) => item.date === date);
}

export async function getPlannerContext() {
  const store = await readStore();
  const openTodos = store.todos.filter((item) => !item.done);
  const doneTodos = store.todos.filter((item) => item.done);
  const sortedSchedules = [...store.schedules].sort((a, b) => a.date.localeCompare(b.date));

  return {
    openTodos,
    doneTodos,
    schedules: sortedSchedules
  };
}
