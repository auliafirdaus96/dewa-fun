/**
 * tools/socialService.ts
 * AI Social content generation tool. Dynamically shifts tone to produce viral content.
 * Migrated from Python: src/tools/social_service.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLLM } from '../core/llmWrapper.js';

export const generateSocialContent = tool(
  async ({ platform, topic, context_data, tone, recent_mentions, trending_topics }) => {
    try {
      // Get standard AI for generating text
      const llm = getLLM('gpt-4o');

      // Format data string
      let dataStr = 'No specific data provided';
      if (context_data && Object.keys(context_data).length > 0) {
        dataStr = Object.entries(context_data)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      }

      let platformInstructions = '';
      let charLimit = 280;

      if (platform.toLowerCase() === 'twitter') {
        platformInstructions = `
Create a Twitter/X post (max 280 characters).
- Start with a strong hook in first line
- Use 2-3 relevant emojis strategically
- Include 1-2 hashtags maximum
- End with engaging question or call-to-action
- Format with line breaks for readability
`;
        charLimit = 280;
      } else if (platform.toLowerCase() === 'telegram') {
        platformInstructions = `
Create a Telegram announcement post.
- Use Markdown formatting (*bold*, _italic_, \`code\`)
- More detailed than Twitter (up to 4000 characters)
- Include clear sections with emoji dividers
- Add important links if relevant
- End with community engagement prompt
`;
        charLimit = 4000;
      } else {
        platformInstructions = `Create content optimized for ${platform}.`;
        charLimit = 1000;
      }

      const prompt = `You are a professional social media manager for Dewa.fun, an AI-native token launchpad and social casino platform.

YOUR TASK:
${platformInstructions}

BRAND VOICE: ${tone ?? 'witty'}
MAIN TOPIC: ${topic}

KEY DATA POINTS:
${dataStr}

RECENT COMMUNITY MENTIONS:
${recent_mentions && recent_mentions.length > 0 ? recent_mentions.slice(0, 5).map(m => `- ${m}`).join('\n') : 'No recent mentions'}

TRENDING TOPICS TO LEVERAGE:
${trending_topics && trending_topics.length > 0 ? trending_topics.slice(0, 3).map(t => `- #${t}`).join('\n') : 'No trending topics provided'}

GUIDELINES:
1. Sound human and authentic, NOT corporate or robotic
2. Match the specified tone
3. Be informative but concise
4. Create FOMO without being scammy
5. Include subtle call-to-action
6. Avoid excessive hype or unrealistic promises
7. Stay compliant with platform rules

Generate the content now:`;

      const response = await llm.invoke(prompt);
      let content = (response.content as string).trim();

      // Hard enforcement
      if (content.length > charLimit) {
        content = content.substring(0, charLimit - 3) + '...';
      }

      return content;
    } catch (e: any) {
      console.error(`[SocialService] Content generation error: ${e.message}`);
      return `⚠️ Warning: Content generation failed. Error: ${e.message}. Suggest using fallback templates.`;
    }
  },
  {
    name: 'generate_social_content',
    description: 'Generate viral social media content using LLM. Use this to prepare texts for publishing.',
    schema: z.object({
      platform: z.enum(['twitter', 'telegram']).describe('The platform to target (twitter or telegram)'),
      topic: z.string().describe('Main subject to discuss'),
      context_data: z.record(z.any()).optional().describe('Dictionary with relevant data points (price, volume, etc.)'),
      tone: z.string().optional().default('witty').describe('Communication style (witty, bullish, professional, meme, educational)'),
      recent_mentions: z.array(z.string()).optional().describe('List of recent social mentions for context'),
      trending_topics: z.array(z.string()).optional().describe('Current trending hashtags/topics'),
    }),
  }
);
