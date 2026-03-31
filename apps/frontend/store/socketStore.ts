// store/socketStore.ts
import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

interface FeedItem {
  id:          string
  mint:        string
  wallet:      string
  short:       string
  roll:        number
  won:         boolean
  amount:      number
  payout:      number
  mode:        string
  timestamp:   string
}

interface ChatMsg {
  id:        string
  message:   string
  user:      { wallet: string; displayName?: string; short: string }
  createdAt: string
}

interface SocketState {
  socket:      Socket | null
  connected:   boolean
  feed:        FeedItem[]
  chatMsgs:    Record<string, ChatMsg[]>   // keyed by mint

  connect:     (token?: string) => void
  disconnect:  () => void
  joinDice:    (mint: string)   => void
  sendChat:    (mint: string, message: string) => void
  addFeedItem: (item: FeedItem) => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket:    null,
  connected: false,
  feed:      [],
  chatMsgs:  {},

  connect: (token) => {
    const existing = get().socket
    if (existing?.connected) return

    const socket = io(SOCKET_URL, {
      auth:        { token },
      transports:  ['websocket'],
      reconnectionAttempts: 5,
    })

    socket.on('connect',    () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))

    // Global live feed
    socket.on('feed:bet', (item: FeedItem) => {
      set(s => ({ feed: [{ ...item, id: Date.now().toString() }, ...s.feed].slice(0, 50) }))
    })

    // Chat
    socket.on('chat:message', (msg: ChatMsg & { mint: string }) => {
      set(s => ({
        chatMsgs: {
          ...s.chatMsgs,
          [msg.mint]: [...(s.chatMsgs[msg.mint] || []), msg].slice(-100),
        },
      }))
    })

    // Vault events
    socket.on('vault:paused',  (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vault:paused', { detail: data }))
      }
    })
    socket.on('vault:resumed', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vault:resumed', { detail: data }))
      }
    })

    socket.emit('join:feed')
    set({ socket })
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },

  joinDice: (mint) => {
    get().socket?.emit('join:dice', mint)
  },

  sendChat: (mint, message) => {
    get().socket?.emit('chat:send', { mint, message })
  },

  addFeedItem: (item) => {
    set(s => ({ feed: [item, ...s.feed].slice(0, 50) }))
  },
}))
