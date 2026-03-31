/**
 * services/socialAnalyticsService.ts
 * Tracks social media performance, engagement metrics, and posting history.
 * Migrated from Python: src/services/social_analytics_service.py
 */

export class SocialAnalyticsService {
  async getEngagementMetrics(nodeId: string): Promise<Record<string, any>> {
    try {
      // Fetch from database (posts stored in agent_memory or separate table)
      const posts = await this.getPostsForNode(nodeId);

      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalRetweets = posts.reduce((sum, p) => sum + (p.retweets || 0), 0);
      const totalReplies = posts.reduce((sum, p) => sum + (p.replies || 0), 0);

      const avgEngagementRate = totalPosts > 0 ? (totalLikes + totalRetweets + totalReplies) / totalPosts : 0;
      const followerGrowth = await this.getFollowerGrowth(nodeId);

      return {
        total_posts: totalPosts,
        total_likes: totalLikes,
        total_retweets: totalRetweets,
        total_replies: totalReplies,
        avg_engagement_rate: Number(avgEngagementRate.toFixed(2)),
        follower_growth: followerGrowth,
        best_performing_post: this.getBestPost(posts),
        worst_performing_post: this.getWorstPost(posts),
        platforms: {
          twitter: {
            posts: posts.filter((p) => p.platform === 'twitter').length,
            engagement: this.calculatePlatformEngagement(posts, 'twitter'),
          },
          telegram: {
            posts: posts.filter((p) => p.platform === 'telegram').length,
            engagement: this.calculatePlatformEngagement(posts, 'telegram'),
          },
        },
      };
    } catch (e: any) {
      console.error(`Error fetching engagement metrics: ${e.message}`);
      return this.getEmptyMetrics();
    }
  }

  async getPostHistory(nodeId: string, limit = 50): Promise<any[]> {
    try {
      const posts = await this.getPostsForNode(nodeId);
      const sorted = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return sorted.slice(0, limit);
    } catch (e: any) {
      console.error(`Error fetching post history: ${e.message}`);
      return [];
    }
  }

  async getTrendingTopics(nodeId: string): Promise<any[]> {
    // In production, fetch from Twitter trends API
    return [
      { topic: '#Solana', volume: '125K tweets', growth: '+45%', relevance_score: 9.2 },
      { topic: '#DeFi', volume: '89K tweets', growth: '+32%', relevance_score: 8.7 },
      { topic: '#AIAGENTS', volume: '67K tweets', growth: '+58%', relevance_score: 9.5 },
    ];
  }

  generateInsights(metrics: Record<string, any>): string[] {
    const insights: string[] = [];
    const totalPosts = metrics.total_posts || 0;
    const avgEngagement = metrics.avg_engagement_rate || 0;
    const followerGrowth = metrics.follower_growth || {};

    if (totalPosts >= 50) insights.push('✅ Great posting consistency! You are maintaining strong presence.');
    else if (totalPosts >= 20) insights.push('📊 Good start! Consider increasing to 3-5 posts per day.');
    else insights.push('💡 Try to post more frequently to build momentum.');

    if (avgEngagement >= 50) insights.push('🔥 Excellent engagement! Your content really resonates.');
    else if (avgEngagement >= 20) insights.push('✅ Solid engagement rate. Keep creating quality content!');
    else if (avgEngagement >= 5) insights.push('⚠️ Engagement could improve. Try more engaging content formats.');
    else insights.push('📉 Low engagement detected. Review your content strategy.');

    if (followerGrowth.percentage >= 10) insights.push('🚀 Strong follower growth! Your audience is expanding.');
    else if (followerGrowth.percentage >= 5) insights.push('✅ Steady follower growth. Keep it up!');
    else insights.push('💡 Focus on viral content to accelerate follower growth.');

    return insights;
  }

  // ---- Mock Data / Internal Generators ----
  private async getPostsForNode(nodeId: string): Promise<any[]> {
    const d = new Date();
    return [
      {
        id: 'post_1',
        platform: 'twitter',
        content: '🚀 Just launched our new AI agent on Solana! #DeFi #AI',
        created_at: new Date(d.getTime() - 2 * 3600000).toISOString(),
        likes: 145,
        retweets: 32,
        replies: 12,
      },
    ];
  }

  private async getFollowerGrowth(nodeId: string) {
    return { current_followers: 1247, previous_followers: 1189, growth: 58, percentage: 4.88, period_days: 7 };
  }

  private getBestPost(posts: any[]) {
    if (!posts.length) return null;
    return posts.reduce((max, p) => ((p.likes || 0) + (p.retweets || 0) > (max.likes || 0) + (max.retweets || 0) ? p : max), posts[0]);
  }

  private getWorstPost(posts: any[]) {
    if (!posts.length) return null;
    return posts.reduce((min, p) => ((p.likes || 0) + (p.retweets || 0) < (min.likes || 0) + (min.retweets || 0) ? p : min), posts[0]);
  }

  private calculatePlatformEngagement(posts: any[], platform: string): number {
    const platformPosts = posts.filter((p) => p.platform === platform);
    if (!platformPosts.length) return 0.0;

    const total = platformPosts.reduce((sum, p) => sum + (p.likes || 0) + (p.retweets || 0) + (p.replies || 0), 0);
    return Number((total / platformPosts.length).toFixed(2));
  }

  private getEmptyMetrics() {
    return {
      total_posts: 0,
      total_likes: 0,
      total_retweets: 0,
      total_replies: 0,
      avg_engagement_rate: 0,
      follower_growth: { current_followers: 0, growth: 0, percentage: 0 },
      best_performing_post: null,
      worst_performing_post: null,
      platforms: {
        twitter: { posts: 0, engagement: 0 },
        telegram: { posts: 0, engagement: 0 },
      },
    };
  }
}

export const socialAnalyticsService = new SocialAnalyticsService();
