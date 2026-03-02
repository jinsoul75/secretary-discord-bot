import 'dotenv/config';
import { commandData } from '../src/command-data.js';

const {
  DISCORD_TOKEN,
  DISCORD_APPLICATION_ID,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID
} = process.env;

const appId = DISCORD_APPLICATION_ID || DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !appId) {
  console.error('DISCORD_TOKEN, DISCORD_APPLICATION_ID(또는 DISCORD_CLIENT_ID)가 필요합니다.');
  process.exit(1);
}

const route = DISCORD_GUILD_ID
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${DISCORD_GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

const response = await fetch(route, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${DISCORD_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(commandData)
});

if (!response.ok) {
  const errorBody = await response.text();
  console.error(`명령어 등록 실패 (${response.status}): ${errorBody}`);
  process.exit(1);
}

console.log(`명령어 ${commandData.length}개 등록 완료 (${DISCORD_GUILD_ID ? 'guild' : 'global'}).`);
