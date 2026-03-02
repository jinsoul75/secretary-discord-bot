import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';
import { handleApplicationCommand } from '../src/interaction-handler.js';

export const config = {
  api: {
    bodyParser: false
  }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    res.status(500).send('DISCORD_PUBLIC_KEY is not configured');
    return;
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = await readRawBody(req);

  if (!signature || !timestamp) {
    res.status(401).send('Missing signature headers');
    return;
  }

  const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
  if (!isValidRequest) {
    console.error('Signature verification failed', {
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      bodyLength: rawBody.length
    });
    res.status(401).send('Bad request signature');
    return;
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    res.status(200).json({ type: InteractionResponseType.PONG });
    return;
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const response = await handleApplicationCommand(interaction, process.env);
    res.status(200).json(response);
    return;
  }

  res.status(200).json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '지원하지 않는 인터랙션 타입입니다.',
      flags: 64
    }
  });
}
