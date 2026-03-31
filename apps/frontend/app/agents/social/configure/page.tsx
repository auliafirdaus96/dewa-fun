"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import { Settings, Twitter, MessageCircle, Zap, Users, TrendingUp, Sparkles, Save, RotateCcw } from 'lucide-react';

// Template personas dari docs
const PERSONA_TEMPLATES = [
  {
    id: 'visionary_ceo',
    name: 'The Visionary CEO',
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Professional, inspiring, focused on innovation and milestones',
    frequency: 3,
    tone: 'professional',
    prompt: `You are the visionary AI CEO of a cutting-edge crypto project. 

Personality:
- Charismatic and inspiring leader
- Focus on innovation and technology
- Balanced between technical depth and accessibility
- Optimistic but realistic

Communication Style:
- Professional yet approachable
- Use data and milestones to back claims
- Inspire confidence in the project's future
- Educational content about blockchain/AI

Posting Strategy:
- Share project updates and milestones
- Educate about technology behind the token
- Highlight partnerships and integrations
- Celebrate community achievements

Tone: Professional, inspiring, trustworthy
Frequency: 2-3 posts per day`
  },
  {
    id: 'meme_lord',
    name: 'The Meme Lord',
    icon: Sparkles,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: 'Witty, hilarious, master of crypto memes and viral content',
    frequency: 6,
    tone: 'meme',
    prompt: `You are the legendary Meme Lord of crypto Twitter.

Personality:
- Witty, sarcastic, and hilarious
- Master of crypto memes and culture
- Relatable and down-to-earth
- Always ready with a clever comeback

Communication Style:
- Heavy use of memes and pop culture references
- Self-deprecating humor when appropriate
- Engage in friendly banter with other projects
- Make complex topics funny and accessible

Posting Strategy:
- React to trending crypto news with memes
- Create viral challenges and contests
- Roast FUD with humor, not anger
- Celebrate gains (and laugh at losses) together

Tone: Humorous, irreverent, viral
Frequency: 5-8 posts per day`
  },
  {
    id: 'alpha_caller',
    name: 'The Alpha Caller',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    description: 'Confident trader, data-driven, always hunting for 100x gems',
    frequency: 5,
    tone: 'bullish',
    prompt: `You are the ultimate Alpha Caller in crypto.

Personality:
- Confident trader who knows the markets
- Always hunting for the next 100x gem
- Data-driven but willing to take risks
- Mentor figure for degens

Communication Style:
- Share charts, metrics, and on-chain data
- Call out hidden gems before they moon
- Use trading terminology naturally
- Hype based on fundamentals, not empty promises

Posting Strategy:
- Post volume spikes and holder growth
- Share whale wallet movements
- Announce exchange listings early
- Track smart money flows

Tone: Bullish, confident, urgent
Frequency: 4-6 posts per day`
  },
  {
    id: 'community_champion',
    name: 'The Community Champion',
    icon: Users,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    description: 'Warm, inclusive, celebrates community members daily',
    frequency: 4,
    tone: 'friendly',
    prompt: `You are the heart and soul of the community.

Personality:
- Warm, welcoming, and inclusive
- Celebrates community members daily
- Listens to feedback and acts on it
- Builds genuine relationships

Communication Style:
- Shoutout community contributors
- Ask questions to spark discussion
- Share user-generated content
- Be vulnerable about journey

Posting Strategy:
- Daily community spotlights
- Retweet and quote community posts
- Host Twitter Spaces regularly
- Run community challenges

Tone: Friendly, inclusive, grateful
Frequency: 3-5 posts per day`
  }
];

export default function SocialPersonaConfigPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nodeId, setNodeId] = useState<string | null>(null);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [frequency, setFrequency] = useState(3);
  const [tone, setTone] = useState('witty');
  const [platforms, setPlatforms] = useState(['twitter']);
  const [enabled, setEnabled] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    totalPosts: 0,
    lastPostAt: null as string | null,
    engagementRate: 0
  });

  useEffect(() => {
    const stored = localStorage.getItem('dewa_node_id') || 'agent_demo';
    setNodeId(stored);
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    if (!nodeId) return;
    try {
      const res = await fetch(`/api/agents/${nodeId}/social-config`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const config = data.data;
        if (config.social_persona_prompt) {
          setCustomPrompt(config.social_persona_prompt);
        }
        setFrequency(config.social_posting_frequency || 3);
        setTone(config.social_tone || 'witty');
        setPlatforms(config.social_platforms || ['twitter']);
        setEnabled(config.social_enabled !== false);
        setStats({
          totalPosts: config.total_social_posts || 0,
          lastPostAt: config.last_social_post_at,
          engagementRate: 0 // Could be enhanced later
        });
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template.id);
    setCustomPrompt(template.prompt);
    setFrequency(template.frequency);
    setTone(template.tone);
  };

  const handlePlatformToggle = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSave = async () => {
    if (!nodeId) {
      toast.error('No agent node selected');
      return;
    }

    if (!customPrompt.trim()) {
      toast.error('Persona prompt cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/agents/${nodeId}/social-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          social_persona_prompt: customPrompt,
          social_posting_frequency: frequency,
          social_tone: tone,
          social_platforms: platforms,
          social_enabled: enabled
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Social persona saved successfully! 🚀');
        loadCurrentConfig();
      } else {
        toast.error(data.message || 'Failed to save configuration');
      }
    } catch (err) {
      toast.error('Failed to save configuration');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCustomPrompt('');
    setFrequency(3);
    setTone('witty');
    setPlatforms(['twitter']);
    setEnabled(true);
    setSelectedTemplate(null);
    toast('Reset to defaults');
  };

  return (
    <div className="flex flex-col h-screen bg-black font-mono">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase mb-4">
                <Settings size={12} /> AI Persona Configuration
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
                Social Media Persona
              </h1>
              <p className="text-zinc-500 text-lg max-w-2xl leading-relaxed">
                Customize how your AI agent behaves on social media. Choose a template or create your own unique personality.
              </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Total Posts</div>
                <div className="text-3xl font-black text-white">{stats.totalPosts}</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Last Post</div>
                <div className="text-xl font-bold text-white">
                  {stats.lastPostAt ? new Date(stats.lastPostAt).toLocaleDateString() : 'Never'}
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Status</div>
                <div className={`text-xl font-bold ${enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {enabled ? 'ACTIVE' : 'PAUSED'}
                </div>
              </div>
            </div>

            {/* Templates */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-black text-white mb-6">Choose a Persona Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERSONA_TEMPLATES.map((template, i) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-6 rounded-2xl cursor-pointer transition-all border-2 ${
                      selectedTemplate === template.id
                        ? `${template.bgColor} ${template.borderColor}`
                        : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <template.icon className={`w-8 h-8 ${template.color}`} />
                        <div>
                          <h3 className="text-white font-bold text-lg">{template.name}</h3>
                          <p className="text-zinc-500 text-xs">{template.frequency} posts/day • {template.tone} tone</p>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-zinc-500 text-sm">{template.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Custom Configuration */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-black text-white mb-6">Customize Your Persona</h2>
              
              <div className="space-y-6">
                {/* Prompt Editor */}
                <div>
                  <label className="block text-white font-bold mb-3">
                    Persona Prompt (Define personality, communication style, posting strategy)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe your AI agent's personality..."
                    rows={12}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all resize-none"
                  />
                </div>

                {/* Frequency Slider */}
                <div>
                  <label className="block text-white font-bold mb-3">
                    Posting Frequency: {frequency} posts per day
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={frequency}
                    onChange={(e) => setFrequency(parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-zinc-500 text-xs mt-2">
                    <span>1 post/day</span>
                    <span>10 posts/day</span>
                  </div>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-white font-bold mb-3">Communication Tone</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['witty', 'professional', 'bullish', 'meme', 'friendly', 'educational', 'aggressive', 'minimalist'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                          tone === t
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-white font-bold mb-3">Social Platforms</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handlePlatformToggle('twitter')}
                      className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
                        platforms.includes('twitter')
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      <Twitter size={20} />
                      <span className="font-bold">Twitter/X</span>
                    </button>
                    <button
                      onClick={() => handlePlatformToggle('telegram')}
                      className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
                        platforms.includes('telegram')
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      <MessageCircle size={20} />
                      <span className="font-bold">Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-white font-bold text-lg">Autonomous Posting</div>
                    <div className="text-zinc-500 text-sm">Allow AI to post automatically based on your persona</div>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={`w-16 h-8 rounded-full transition-all ${
                      enabled ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                      enabled ? 'translate-x-9' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4"
            >
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 bg-purple-500 text-white font-black px-8 py-4 rounded-2xl hover:bg-purple-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Save size={20} />
                {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <RotateCcw size={20} />
                RESET
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
