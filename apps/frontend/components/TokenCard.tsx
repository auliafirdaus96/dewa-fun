import Image from 'next/image';
import Link from 'next/link';
import { Token } from '@/data/tokens';

export function TokenCard({ token }: { token: Token }) {
  return (
    <Link href={`/token/${token.id}`} className="block">
      <div className="group border border-white/10 rounded-3xl bg-[#111111] hover:bg-white/[0.02] hover:border-white/20 p-5 cursor-pointer transition-all duration-300 flex flex-col gap-4 font-sans relative overflow-hidden">
        <div className="flex gap-4">
          <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-black/50">
            <Image
              src={token.logo}
              alt={token.name}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-white truncate text-base">
                {token.name} <span className="text-white/40 font-normal ml-1">${token.ticker}</span>
              </h3>
            </div>
            <p className="text-xs text-white/40 mt-1">
              created by <span className="text-white/70 hover:text-white transition-colors cursor-pointer">{token.creator}</span>
            </p>
          </div>
        </div>
        
        <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">
          {token.description}
        </p>
        
        <div className="mt-2 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>Bonding Curve</span>
              <span className="text-white/80 font-medium">{token.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/50 rounded-full border border-white/5 overflow-hidden">
              <div 
                className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500 rounded-full"
                style={{ width: `${token.progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
            <span className="text-white/80 font-medium">MC: {token.marketCap}</span>
            <span className="text-white/40">replies: {token.replies}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
