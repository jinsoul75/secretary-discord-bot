import { exchangeGoogleTasksCode } from '../../../src/google-tasks.js';
import {
  clearGoogleTasksOauthState,
  getGoogleTasksOauthState,
  setGoogleTasksTokens
} from '../../../src/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { code, state, error } = req.query;
  if (error) {
    res.status(400).send(`Google OAuth error: ${error}`);
    return;
  }

  if (!code || !state) {
    res.status(400).send('Missing code or state');
    return;
  }

  const savedState = await getGoogleTasksOauthState();
  if (!savedState || savedState.value !== state) {
    res.status(400).send('Invalid OAuth state');
    return;
  }

  try {
    const tokens = await exchangeGoogleTasksCode({ env: process.env, code });
    await setGoogleTasksTokens(tokens);
    await clearGoogleTasksOauthState();
    res.status(200).send('Google Tasks 연동이 완료되었습니다. Discord로 돌아가서 /gcal_list 또는 /day_summary 를 다시 실행하세요.');
  } catch (oauthError) {
    res.status(500).send(`Google Tasks OAuth failed: ${oauthError.message}`);
  }
}
