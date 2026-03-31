// components/shared/Header.tsx
'use client'
import Link         from 'next/link'
import { useState } from 'react'
import { useAuth }  from '@/hooks/useAuth'
import { useSocketStore } from '@/store/socketStore'
import { Menu, X, Bell }  from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps { onMenuClick: () => void }

export function Header({ onMenuClick }: HeaderProps) {
  const { user, shortAddress, openWallet, isAuthenticated } = useAuth()
  const { connected } = useSocketStore()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="h-[60px] bg-[rgba(6,9,16,0.97)] backdrop-blur-xl border-b border-dim flex items-center px-4 gap-3 sticky top-0 z-50 flex-shrink-0">

      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-[var(--t2)] hover:bg-hover transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-panel border border-[rgba(99,179,237,0.25)] flex items-center justify-center text-[17px]">
          🎲
        </div>
        <span className="text-[17px] font-bold gradient-accent hidden sm:block">dewa.fun</span>
      </Link>

      {/* Nav */}
      <nav className="hidden md:flex items-center gap-1 ml-4">
        {[
          { href: '/',            label: 'Launchpad' },
          { href: '/games/dice',        label: '🎲 Dice' },
          { href: '/games/leaderboard', label: 'Leaderboard' },
          { href: '/affiliate',   label: 'Affiliate' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-[13px] font-medium text-[var(--t2)] px-3 py-[6px] rounded-lg hover:bg-hover hover:text-[var(--t1)] transition-all"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Socket status indicator */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--t3)]">
        <span className={cn('w-[6px] h-[6px] rounded-full', connected ? 'bg-[var(--g)] animate-pulse' : 'bg-[var(--t3)]')} />
        {connected ? 'Live' : 'Offline'}
      </div>

      {/* Notif */}
      {isAuthenticated && (
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="w-[36px] h-[36px] bg-panel border border-dim rounded-[8px] flex items-center justify-center text-[var(--t2)] hover:border-[var(--bop)] hover:text-[var(--t1)] transition-all"
        >
          <Bell size={15} />
        </button>
      )}

      {/* Wallet button */}
      <button
        onClick={openWallet}
        className={cn(
          'px-[18px] py-[8px] rounded-[9px] text-[13px] font-semibold transition-all whitespace-nowrap',
          isAuthenticated
            ? 'bg-[rgba(104,211,145,0.15)] border border-[rgba(104,211,145,0.35)] text-[var(--g)] hover:bg-[rgba(104,211,145,0.25)]'
            : 'gradient-btn text-white hover:opacity-90 hover:-translate-y-[1px]'
        )}
      >
        {isAuthenticated ? shortAddress : 'Connect Wallet'}
      </button>
    </header>
  )
}
