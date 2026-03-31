"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, TrendingUp, Shield, Zap, Info, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletService } from '@/services/WalletService';
import { pushNotificationService } from '@/services/PushNotificationService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
}

interface DLMMPosition {
  poolAddress: string;
  minValue: number;
  maxValue: number;
  currentValue: number;
  apy: number;
  impermanentLoss: number;
}

export function DlmmChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState<DLMMPosition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Request notification permission on mount
  useEffect(() => {
    pushNotificationService.requestPermission();
  }, []);

  // Load user's DLMM position on mount
  useEffect(() => {
    loadPosition();
    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your DLMM Assistant. I can help you manage liquidity positions, optimize yields, and protect against impermanent loss.\n\nTry asking:\n• \"How's my LP position doing?\"\n• \"Should I rebalance my pool?\"\n• \"What's the safest pair for yield farming?\"",
      timestamp: new Date()
    }]);
  }, []);

  const loadPosition = async () => {
    try {
      const res = await fetch('/api/agents/dlmm/position');
      if (res.ok) {
        const data = await res.json();
        setPosition(data);
      }
    } catch (error) {
      console.error('Failed to load position:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agents/dlmm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          position
        })
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If action was executed, refresh position
      if (data.executed) {
        setTimeout(loadPosition, 2000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get AI response');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = async (action: string, params?: Record<string, any>) => {
    // Add user confirmation message
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Execute: ${action}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
    
    // Execute action through wallet service
    setIsLoading(true);
    try {
      const result = await walletService.executeDlmmAction(action, params || {});
      
      if (result.success && result.signature) {
        // Log to history
        await walletService.logActionToHistory({
          actionType: action,
          params: params || {},
          signature: result.signature,
          status: 'approved',
          timestamp: new Date()
        });
        
        // Show success notification
        pushNotificationService.success(
          'Transaction Executed!',
          `${action} completed successfully. Signature: ${result.signature?.slice(0, 8)}...`
        );
        
        // Add AI response message
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ ${action} executed successfully!\n\nSignature: ${result.signature?.slice(0, 8)}...\n\nThe transaction has been submitted to the network.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
        
        // Refresh position after successful action
        setTimeout(loadPosition, 2000);
      } else {
        // Transaction failed or rejected
        pushNotificationService.error(
          'Transaction Failed',
          result.error || 'Unknown error occurred'
        );
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${action} failed: ${result.error}\n\nPlease try again or contact support if the issue persists.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Action execution error:', error);
      pushNotificationService.error(
        'Execution Error',
        error.message || 'Failed to execute action'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">DLMM Assistant</h3>
            <p className="text-zinc-500 text-xs">AI-Powered Liquidity Management</p>
          </div>
          {position && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-bold">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleActionClick(action.action, action.params)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-all active:scale-95"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                
                <p className={`text-[10px] mt-2 ${
                  message.role === 'user' ? 'text-emerald-200' : 'text-zinc-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/10 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="text-zinc-400 text-sm">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Position Summary (if available) */}
      {position && (
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-1">Value</p>
              <p className="text-white font-bold">${position.currentValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">APY</p>
              <p className="text-emerald-400 font-bold">{position.apy.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">Range</p>
              <p className="text-white font-bold text-sm">
                ${position.minValue} - ${position.maxValue}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your LP position..."
            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
