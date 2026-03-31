/**
 * tools/contentTools.ts
 * Integrations for social media (Twitter/X and Telegram).
 * Migrated from Python: src/tools/content_tools.py
 */

import { TwitterApi } from 'twitter-api-v2';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  TWITTER_DRY_RUN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from '../core/config.js';

// ─── Twitter Client Setup ───────────────────────────────────────────────────
let twitterClient: TwitterApi | null = null;
const {
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET,
} = process.env;

if (TWITTER_API_KEY && TWITTER_API_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET) {
  twitterClient = new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });
}

// ─── Post to Twitter Tool ───────────────────────────────────────────────────
export const postToTwitter = tool(
  async ({ text }) => {
    // Hard truncate to 280 chars for X safety
    const tweetText = text.substring(0, 280);

    if (TWITTER_DRY_RUN) {
      console.log(`[Twitter DRY-RUN] Would have posted: ${tweetText}`);
      return `[DRY-RUN] Tweet simulated: '${tweetText.substring(0, 60)}...'`;
    }

    if (!twitterClient) {
      return 'Twitter API keys not configured. Set TWITTER credentials in .env';
    }

    try {
      const response = await twitterClient.v2.tweet(tweetText);
      const tweetId = response.data.id;
      console.log(`[Twitter] Posted tweet ID: ${tweetId}`);
      return `Tweet posted successfully! ID: ${tweetId} | https://x.com/i/web/status/${tweetId}`;
    } catch (e: any) {
      console.error(`[Twitter ERROR] ${e.message}`);
      return `Twitter API error: ${e.message}`;
    }
  },
  {
    name: 'post_to_twitter',
    description: 'Post a tweet on X (Twitter). Enforces a 280-character limit. Uses app identity.',
    schema: z.object({
      text: z.string().describe('The content of the tweet to post'),
    }),
  }
);

// ─── Post to Telegram Tool ───────────────────────────────────────────────────
export const sendTelegramMsg = tool(
  async ({ message }) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return 'Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env';
    }

    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const msgId = data.result?.message_id;
        console.log(`[Telegram] Message sent. ID: ${msgId}`);
        return `Telegram message sent successfully. Message ID: ${msgId}`;
      } else {
        const text = await response.text();
        return `Telegram error (${response.status}): ${text}`;
      }
    } catch (e: any) {
      return `Error sending Telegram message: ${e.message}`;
    }
  },
  {
    name: 'send_telegram_msg',
    description: 'Send a real notification message to a Telegram community chat group via Bot API.',
    schema: z.object({
      message: z.string().describe('The message content, supports markdown formatting (*bold*, _italic_)'),
    }),
  }
);
