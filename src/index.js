import 'dotenv/config';
import { createServer } from 'node:http';
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from 'discord.js';
import { commandData, handleCommand } from './commands.js';
import { startReminderJob } from './reminder.js';

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  GEMINI_API_KEY,
  GEMINI_MODEL = 'gemini-2.5-flash',
  PORT = '10000',
  REMINDER_CHANNEL_ID,
  REMINDER_TIMEZONE = 'Asia/Seoul',
  REMINDER_HOUR = '9',
  REMINDER_MINUTE = '0'
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('DISCORD_TOKEN 또는 DISCORD_CLIENT_ID가 설정되지 않았습니다.');
  process.exit(1);
}

// Render web service requirement: bind HTTP server to PORT/0.0.0.0.
const healthServer = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('secretary-bot is running');
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
    body: commandData
  });
  console.log(`Registered ${commandData.length} commands.`);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startReminderJob(client, {
    channelId: REMINDER_CHANNEL_ID,
    timeZone: REMINDER_TIMEZONE,
    reminderHour: Number(REMINDER_HOUR),
    reminderMinute: Number(REMINDER_MINUTE)
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    await handleCommand(interaction, {
      GEMINI_API_KEY,
      GEMINI_MODEL
    });
  } catch (error) {
    const message = `명령 처리 중 오류가 발생했습니다: ${error.message}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

(async () => {
  try {
    healthServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Health server listening on 0.0.0.0:${PORT}`);
    });
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error('봇 시작 실패:', error);
    process.exit(1);
  }
})();
