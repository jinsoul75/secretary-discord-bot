import { GoogleGenAI } from '@google/genai';

function formatContext(context) {
  const openTodosText = context.openTodos.length
    ? context.openTodos
        .map((todo) => `- [${todo.id}] ${todo.title}${todo.dueDate ? ` (due: ${todo.dueDate})` : ''}`)
        .join('\n')
    : '- (none)';

  const schedulesText = context.schedules.length
    ? context.schedules
        .map((item) => `- [${item.id}] ${item.date}: ${item.content}`)
        .join('\n')
    : '- (none)';

  return `Open TODOs:\n${openTodosText}\n\nSchedules:\n${schedulesText}`;
}

export async function askPlannerAI({ question, context, apiKey, model }) {
  if (!apiKey) {
    return 'GEMINI_API_KEY가 설정되지 않았습니다. `.env` 파일을 확인해 주세요.';
  }

  const system = [
    'You are a personal planning assistant in Discord.',
    'Answer in Korean by default.',
    'Use the provided TODO and schedule context.',
    'If there is missing data, clearly say what is missing and suggest a concrete next action.',
    'Keep responses concise and actionable.'
  ].join(' ');

  const prompt = [
    'Context:',
    formatContext(context),
    '',
    'User question:',
    question,
    '',
    'Assistant:'
  ].join('\n');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system
    }
  });

  return response.text?.trim() || '답변 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}
