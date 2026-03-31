// ─────────────────────────────────────────────
// websocket/socketServer.ts
// Realtime: dice results, live feed, chat, vault events
// ─────────────────────────────────────────────
// @ts-expect-error - missing types due to network issues
import type { Server, Socket } from 'socket.io'
import { prisma }  from '../lib/prisma.js'
import { verifyToken } from '../lib/auth.js'

export function setupSocketIO(io: Server) {

  // ── Auth middleware ───────────────────────
  io.use(async (socket: any, next: any) => {
    const token = socket.handshake.auth?.token
    if (!token) return next() // anonim ok untuk live feed & chat read

    try {
      const payload = await verifyToken(token)
      socket.data.userId = payload.userId
      socket.data.wallet = payload.wallet
      next()
    } catch {
      next() // lanjut tanpa auth, restricted actions akan dicek di handler
    }
  })

  io.on('connection', (socket: Socket) => {

    // ── JOIN ROOMS ──────────────────────────

    // Join live feed global
    socket.on('join:feed', () => {
      socket.join('feed:global')
    })

    // Join vault room (untuk update paused/resumed)
    socket.on('join:vault', (mint: string) => {
      if (mint) socket.join(`vault:${mint}`)
    })

    // Join dice room untuk token tertentu
    socket.on('join:dice', (mint: string) => {
      if (mint) socket.join(`dice:${mint}`)
    })

    // Join session room untuk streaming auto-bet progress
    socket.on('join:session', (sessionId: string) => {
      if (sessionId && socket.data.userId) {
        socket.join(`session:${sessionId}`)
      }
    })

    // ── CHAT ────────────────────────────────
    socket.on('chat:send', async (data: { mint: string; message: string }) => {
      if (!socket.data.userId) {
        socket.emit('error', { code: 'AUTH_REQUIRED' }); return
      }
      if (!data.message?.trim() || data.message.length > 500) return

      // Simpan ke DB
      const msg = await prisma.chatMessage.create({
        data: {
          userId:  socket.data.userId,
          mint:    data.mint,
          message: data.message.trim(),
        },
        include: { user: { select: { walletAddress: true, displayName: true } } },
      })

      // Broadcast ke room
      io.to(`dice:${data.mint}`).emit('chat:message', {
        id:          msg.id,
        message:     msg.message,
        user: {
          wallet:      msg.user.walletAddress,
          displayName: msg.user.displayName,
          short:       `${msg.user.walletAddress.slice(0,4)}...${msg.user.walletAddress.slice(-4)}`,
        },
        createdAt: msg.createdAt,
      })
    })

    // ── LIVE FEED ────────────────────────────
    // Emit bet results ke global feed
    socket.on('dice:result', (data: {
      mint:      string
      wallet:    string
      roll:      number
      won:       boolean
      amount:    number
      payout:    number
      mode:      string
    }) => {
      io.to('feed:global').emit('feed:bet', {
        ...data,
        short:     `${data.wallet.slice(0,4)}...${data.wallet.slice(-4)}`,
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('disconnect', () => {})
  })
}
