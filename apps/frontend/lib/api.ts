// lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function getToken(): string | null {
  try {
    const s = localStorage.getItem('dewafun-auth')
    if (!s) return null
    return JSON.parse(s)?.state?.token ?? null
  } catch { return null }
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res   = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || json.error || 'Request failed')
  return json
}

// ── Auth ──────────────────────────────────────
export const api = {
  auth: {
    getNonce:      (wallet: string) => req<{ nonce: string }>(`/auth/nonce?wallet=${wallet}`),
    login:         (body: { wallet: string; signature: string; nonce: string }) =>
                     req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me:            () => req<{ user: any }>('/auth/me'),
    registerEmail: (email: string) =>
                     req('/auth/email/register', { method: 'POST', body: JSON.stringify({ email }) }),
    verifyEmail:   (otp: string) =>
                     req('/auth/email/verify', { method: 'POST', body: JSON.stringify({ otp }) }),
  },

  // ── Vault ──────────────────────────────────
  vault: {
    get:        (mint: string) => req<{ data: any }>(`/vault/${mint}`),
    getStats:   (mint: string) => req<{ data: any }>(`/vault/${mint}/stats`),
    initialize: (body: any)    => req('/vault/initialize',    { method: 'POST', body: JSON.stringify(body) }),
    topup:      (mint: string, body: any) =>
                  req(`/vault/${mint}/topup`, { method: 'POST', body: JSON.stringify(body) }),
  },

  // ── Dice — Manual ──────────────────────────
  dice: {
    prepare:     (body: any) => req<{ data: any }>('/dice/manual/prepare', { method: 'POST', body: JSON.stringify(body) }),
    getResult:   (betId: string) => req<{ data: any }>(`/dice/manual/result/${betId}`),

    autoStart:   (body: any)     => req<{ data: any }>('/dice/auto/start', { method: 'POST', body: JSON.stringify(body) }),
    autoRun:     (body: any)     => req<{ data: any }>('/dice/auto/run',   { method: 'POST', body: JSON.stringify(body) }),
    autoSettle:  (body: any)     => req<{ data: any }>('/dice/auto/settle-tx', { method: 'POST', body: JSON.stringify(body) }),

    flashRun:    (body: any)     => req<{ data: any }>('/dice/flash/run',      { method: 'POST', body: JSON.stringify(body) }),
    flashSettle: (body: any)     => req<{ data: any }>('/dice/flash/settle-tx',{ method: 'POST', body: JSON.stringify(body) }),

    rotateSeed:  (sessionId: string) =>
                   req<{ data: any }>('/dice/rotate-seed', { method: 'POST', body: JSON.stringify({ sessionId }) }),
    verify:      (body: any)     => req<{ data: any }>('/dice/verify', { method: 'POST', body: JSON.stringify(body) }),
    history:     (params?: { mint?: string; page?: number; limit?: number }) => {
                   const q = new URLSearchParams(params as any).toString()
                   return req<{ data: any }>(`/dice/history${q ? '?' + q : ''}`)
                 },
    stats:       (mint?: string) => req<{ data: any }>(`/dice/stats${mint ? '?mint=' + mint : ''}`),
  },

  // ── Leaderboard ────────────────────────────
  leaderboard: {
    get: (params?: { period?: string; sort?: string; mint?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString()
      return req<{ data: any[] }>(`/leaderboard${q ? '?' + q : ''}`)
    },
  },

  // ── Affiliate ──────────────────────────────
  affiliate: {
    my:      ()           => req<{ data: any[] }>('/affiliate/my'),
    create:  ()           => req<{ data: any }>('/affiliate/create', { method: 'POST' }),
    track:   (code: string) => req(`/affiliate/${code}/track`),
    convert: (code: string) => req(`/affiliate/${code}/convert`, { method: 'POST' }),
    stats:   (code: string) => req<{ data: any }>(`/affiliate/${code}/stats`),
  },

  // ── Chat ───────────────────────────────────
  chat: {
    get: (mint: string, params?: { limit?: number; before?: string }) => {
      const q = new URLSearchParams(params as any).toString()
      return req<{ data: any[] }>(`/chat/${mint}${q ? '?' + q : ''}`)
    },
  },
}
