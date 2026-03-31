// hooks/useAuth.ts
'use client'
import { useCallback, useEffect } from 'react'
import { useWallet }    from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import bs58             from 'bs58'
import toast            from 'react-hot-toast'
import { api }          from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useSocketStore } from '@/store/socketStore'

export function useAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { token, user, setAuth, clearAuth } = useAuthStore()
  const { connect: connectSocket, disconnect: disconnectSocket } = useSocketStore()

  // Auto sign-in saat wallet connect
  useEffect(() => {
    if (connected && publicKey && !token) {
      signIn()
    }
  }, [connected, publicKey])

  // Connect socket setelah auth
  useEffect(() => {
    if (token) connectSocket(token)
    else disconnectSocket()
  }, [token])

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) return

    const wallet = publicKey.toBase58()
    try {
      const { nonce }     = await api.auth.getNonce(wallet)
      const msgBytes      = new TextEncoder().encode(nonce)
      const signedBytes   = await signMessage(msgBytes)
      const signature     = bs58.encode(signedBytes)
      const { token, user } = await api.auth.login({ wallet, signature, nonce })
      setAuth(token, user)
      toast.success(`Wallet terhubung: ${wallet.slice(0,4)}...${wallet.slice(-4)}`)
    } catch (e: any) {
      toast.error('Gagal login: ' + e.message)
    }
  }, [publicKey, signMessage, setAuth])

  const signOut = useCallback(async () => {
    clearAuth()
    disconnectSocket()
    await disconnect()
    toast.success('Wallet terputus')
  }, [clearAuth, disconnect, disconnectSocket])

  const openWallet = useCallback(() => {
    if (connected) signOut()
    else setVisible(true)
  }, [connected, setVisible, signOut])

  const registerEmail = useCallback(async (email: string) => {
    await api.auth.registerEmail(email)
    toast.success('OTP dikirim ke ' + email)
  }, [])

  const verifyEmail = useCallback(async (otp: string) => {
    await api.auth.verifyEmail(otp)
    useAuthStore.getState().updateUser({ emailVerified: true })
    toast.success('Email terverifikasi!')
  }, [])

  return {
    user, token,
    isAuthenticated: !!token,
    walletAddress:   publicKey?.toBase58(),
    shortAddress:    publicKey
      ? `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}`
      : null,
    signIn, signOut, openWallet,
    registerEmail, verifyEmail,
  }
}
