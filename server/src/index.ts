import 'dotenv/config';
import { getDb } from './db/telegram';

/**
 * This is the starting point of the backend. Right now it only checks that we
 * can reach Telegram. It does not start a web server yet, because the API
 * endpoints come in a later step.
 */
async function main(): Promise<void> {
  console.log('Cliq backend starting...');

  try {
    const db = getDb();
    await db.connect();
    console.log('Telegram connection OK. Cliq backend is ready.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Could not connect to Telegram: ' + message);
    console.error(
      'Fix: copy .env.example to .env, then paste your real BOT_TOKEN and CHANNEL_ID.',
    );
    process.exitCode = 1;
  }
}

main();
