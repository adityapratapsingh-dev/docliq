import 'dotenv/config';
import { createClient } from 'gramobase';
import type { GramoBase } from 'gramobase';

/**
 * What is gramobase?
 *
 * gramobase turns a normal Telegram channel into a database. Each Telegram
 * channel acts like a table, and each message in that channel acts like one
 * row of data. You also get file storage for free, because Telegram lets a bot
 * upload files. So the whole backend lives inside Telegram and costs nothing.
 *
 * This file is the single place where we open that connection. Other files ask
 * for the database by calling getDb() instead of connecting again themselves.
 */

let client: GramoBase | undefined;

/**
 * Returns the connected gramobase client, creating it the first time it is
 * asked for. Reads the two settings below from the .env file.
 *
 * The values are read when this function runs, not when the file loads, so
 * .env is always loaded first and a missing value gives a clear message
 * instead of a confusing crash.
 */
export function getDb(): GramoBase {
  if (client) return client;

  const botToken = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;

  if (!botToken || botToken === 'your-telegram-bot-token') {
    throw new Error(
      'BOT_TOKEN is missing. Copy .env.example to .env and paste your real Telegram bot token.',
    );
  }
  if (!channelId || channelId === 'your-telegram-channel-id') {
    throw new Error(
      'CHANNEL_ID is missing. Copy .env.example to .env and paste your real Telegram channel id.',
    );
  }

  client = createClient({ botToken, channelId });
  return client;
}
