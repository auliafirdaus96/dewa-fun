/**
 * listeners/twitterListener.ts
 * Polling listener for Twitter Mentions using Twitter API v2.
 * Migrated from Python: src/listeners/twitter_listener.py
 */

import { TwitterApi } from 'twitter-api-v2';
import { createAgentGraph } from '../graphs/mainGraph.js';

export async function startTwitterListener() {
  const token = process.env.TWITTER_BEARER_TOKEN;
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!token || !accessToken || !appKey || !appSecret || !accessSecret) {
    console.warn('Twitter credentials not fully configured. Twitter listener disabled.');
    return;
  }

  // Initialize Twitter Client (v2)
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  const v2Client = client.v2;

  try {
    const me = await v2Client.me();
    const myUserId = me.data.id;
    console.log(`--- Starting Twitter Social Listener for @${me.data.username} ---`);

    const graph = createAgentGraph();
    let lastId: string | undefined = undefined;

    // Polling Loop
    while (true) {
      console.log(`[${new Date().toLocaleTimeString()}] Polling for new mentions...`);
      try {
        const mentions = await v2Client.userMentions(myUserId, {
          since_id: lastId,
          max_results: 5,
          expansions: ['author_id'],
          'tweet.fields': ['created_at', 'text'],
        });

        if (mentions.data.data && mentions.data.data.length > 0) {
          lastId = mentions.meta.newest_id;
          
          // Process oldest to newest
          const sortedMentions = [...mentions.data.data].reverse();

          for (const mention of sortedMentions) {
            await processMention(v2Client, mention, mentions.includes, graph);
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Rate limit protection
          }
        }
      } catch (e: any) {
        if (e.code === 429) {
          console.warn('[Twitter Listener] Rate limit exceeded. Sleeping for 15 minutes...');
          await new Promise((resolve) => setTimeout(resolve, 15 * 60 * 1000));
          continue;
        }
        console.error(`[Twitter Listener] Polling error: ${e.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 60000)); // Sleep 60s
    }
  } catch (error: any) {
    console.error('Failed to authenticate Twitter API. Please check your tokens.', error.message);
  }
}

async function processMention(client: any, mention: any, includes: any, graph: any) {
  const tweetId = mention.id;
  const text = mention.text;
  const authorId = mention.author_id;

  // Find author username from includes
  const author = includes?.users?.find((u: any) => u.id === authorId);
  const username = author ? author.username : 'User';

  console.log(`\n[Twitter Listener] Processing mention from @${username}: ${text}`);

  const inputs = {
    node_id: 'ai-ceo-twitter',
    persona: 'You are the witty, ruthless, and hyper-intelligent AI CEO of Dewa Launchpad. You are currently replying to a user on Twitter/X in 280 characters or less. Be engaging and viral.',
    messages: [{ role: 'user', content: `User @${username} tweeted at you: ${text}\nReply to them.` }]
  };

  const config = { configurable: { thread_id: `tw_${tweetId}` } };

  try {
    const result = await graph.invoke(inputs, config);
    
    let aiReply = result.messages && result.messages.length > 0
      ? result.messages[result.messages.length - 1].content
      : 'Processing...';

    // Cap at 280 characters
    aiReply = aiReply.substring(0, 280);

    console.log(`[Twitter Listener] Replying: ${aiReply}`);
    
    // Reply to tweet
    await client.reply(aiReply, tweetId);
    console.log('[Twitter Listener] Reply posted successfully.');

  } catch (e: any) {
    console.error(`[Twitter Listener] Error processing mention ${tweetId}: ${e.message}`);
  }
}

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTwitterListener();
}
