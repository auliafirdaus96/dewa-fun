/**
 * listeners/telegramListener.ts
 * Telegram Bot Listener that passes incoming chats to the LangGraph AI Agent.
 * Migrated from Python: src/listeners/telegram_listener.py
 */

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { createAgentGraph } from '../graphs/mainGraph.js';

export async function startTelegramListener() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not found in environment. Telegram listener disabled.');
    return;
  }

  console.log('--- Starting Telegram Social Listener ---');
  const bot = new Telegraf(token);
  const graph = createAgentGraph();

  bot.on(message('text'), async (ctx) => {
    const userText = ctx.message.text;
    const chatId = ctx.chat.id;

    // Ignore commands
    if (userText.startsWith('/')) return;

    console.log(`[Telegram] Received message from ${chatId}: ${userText}`);

    // Prepare inputs
    const inputs = {
      node_id: `tg_${chatId}`,
      persona: 'You are a witty AI CEO of a memecoin launchpad. You are currently chatting on Telegram.',
      messages: [{ role: 'user', content: userText }]
    };

    const config = { configurable: { thread_id: `tg_thread_${chatId}` } };

    try {
      // Send a "typing..." action for better UX
      await ctx.sendChatAction('typing');

      // Invoke Agent Graph
      const result = await graph.invoke(inputs, config);

      // Filter and Send Response
      const messages = result.messages || [];
      const aiReply = messages.length > 0 ? messages[messages.length - 1].content : 'I am thinking...';

      await ctx.reply(aiReply);

    } catch (error: any) {
      console.error(`[Telegram Listener] Error: ${error.message}`);
      await ctx.reply('Sorry, I am currently recalibrating my circuits.');
    }
  });

  bot.launch();

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTelegramListener();
}
