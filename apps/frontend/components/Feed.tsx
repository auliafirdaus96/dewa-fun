"use client";

import { useState } from 'react';
import { TokenCard } from './TokenCard';
import { sampleTokens } from '@/data/tokens';
import Link from 'next/link';

export function Feed() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTokens = sampleTokens.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Marquee */}
      <div className="w-full overflow-hidden border border-white/10 rounded-2xl py-3 mb-8 bg-[#111111]/80 backdrop-blur-md text-white/70 text-xs font-medium whitespace-nowrap relative z-10">
        <div className="animate-pulse inline-block px-4">
          ALERT: PEPE CEO JUST LAUNCHED • ALERT: DOGWIFHAT REACHED $1M MC • ALERT: SOLANA IS CONGESTED • ALERT: NEW COIN &quot;CAT IN A BOX&quot; CREATED
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
        <div className="w-full md:w-auto flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="Search for token..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
          />
        </div>
        
        <Link href="/create" className="w-full md:w-auto text-center bg-white text-black px-6 py-3.5 rounded-xl text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all">
          Start a new coin
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredTokens.length > 0 ? (
          filteredTokens.map((token) => (
            <TokenCard key={token.id} token={token} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-white/40 bg-[#111111] rounded-3xl border border-white/10">
            No tokens found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
