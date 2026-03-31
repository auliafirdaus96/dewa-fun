import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { openWallet, isAuthenticated, shortAddress } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-black p-4 flex flex-col font-mono shrink-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 md:flex",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between mb-8">
          <Link href="/launchpad" className="text-2xl font-black text-white hover:underline tracking-tighter">
            dewa.fun
          </Link>
          <button onClick={onClose} className="md:hidden text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex flex-col gap-1 flex-1 text-sm">
          <Link href="/launchpad" className="hover:text-white hover:bg-zinc-900 p-2 transition-colors">
            Home
          </Link>
          <Link href="/agents/dashboard" className="hover:text-white hover:bg-zinc-900 p-2 transition-colors">
            Profile
          </Link>
          <Link href="/create" className="hover:text-white hover:bg-zinc-900 p-2 transition-colors text-white font-bold">
            Create
          </Link>
          
          <div className="mt-6 mb-2 text-zinc-600 text-[10px] px-2 font-bold tracking-widest uppercase">AGENTS</div>
          <Link href="/agents/launch" className="hover:text-white hover:bg-zinc-900 p-2 pl-4 border-l border-zinc-800 ml-2 transition-colors">
            Agent Launch
          </Link>
          <Link href="/agents/social" className="hover:text-white hover:bg-zinc-900 p-2 pl-4 border-l border-zinc-800 ml-2 transition-colors">
            Agent Social
          </Link>
          <Link href="/agents/dlmm" className="hover:text-white hover:bg-zinc-900 p-2 pl-4 border-l border-zinc-800 ml-2 transition-colors">
            Agent DLMM
          </Link>
          
          <div className="mt-6 mb-2 text-zinc-600 text-[10px] px-2 font-bold tracking-widest">GAMES</div>
          <Link href="/games/dice" className="hover:text-white hover:bg-zinc-900 p-2 pl-4 border-l border-zinc-800 ml-2 transition-colors">
            Dice
          </Link>
          <Link href="/games/leaderboard" className="hover:text-white hover:bg-zinc-900 p-2 pl-4 border-l border-zinc-800 ml-2 transition-colors">
            Leaderboard
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800 flex flex-col gap-4">
          <div className="text-xs text-zinc-500 px-2">sol: $142.50</div>
          <button 
            onClick={openWallet}
            className="w-full border border-white text-white px-4 py-2 hover:bg-white hover:text-black text-sm font-bold transition-colors"
          >
            {isAuthenticated ? shortAddress : 'Connect Wallet'}
          </button>
        </div>
      </aside>
    </>
  );
}
