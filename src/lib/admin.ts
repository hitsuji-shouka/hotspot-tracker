import { useSyncExternalStore } from 'react'

type AdminState = { ready: boolean; canEdit: boolean; configured: boolean; expiresAt: number | null; message: string }
let state: AdminState = { ready: false, canEdit: false, configured: false, expiresAt: null, message: '' }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
let generation = 0
function update(next: Partial<AdminState>) {
  state = { ...state, ...next }
  listeners.forEach(listener => listener())
}
export const canEdit = () => state.canEdit && (state.expiresAt ?? 0) > Date.now()
export function adminMessage(message: string, expired = false) {
  update({ message, ...(expired ? { canEdit: false, expiresAt: null } : {}) })
}
function accept(data: { configured?: boolean; authenticated?: boolean; expiresAt?: number }) {
  clearTimeout(timer)
  const expiresAt = data.expiresAt ?? null
  update({ ready: true, configured: data.configured ?? state.configured, canEdit: !!data.authenticated && !!expiresAt && expiresAt > Date.now(), expiresAt })
  // Timers are limited to ~24 days; periodically check the 30-day session.
  if (state.canEdit) timer = setTimeout(() => { void refreshAdmin() }, Math.min(expiresAt! - Date.now(), 24 * 60 * 60 * 1000))
}
export async function refreshAdmin() {
  const request = ++generation
  try {
    const res = await fetch('/api/admin', { cache: 'no-store', credentials: 'same-origin' })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (request === generation) accept(data)
  } catch { if (request === generation) accept({ authenticated: false, configured: false }) }
}
export async function unlockAdmin(password: string) {
  ++generation
  const res = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '暂时无法解锁，请重试')
  ++generation // Discard status requests sent with the cookie from before login.
  accept(data)
  update({ message: '' })
}
export async function lockAdmin() {
  ++generation
  const res = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  if (!res.ok) throw new Error('退出失败，请重试')
  ++generation // Discard status requests sent before the cookie was cleared.
  accept({ authenticated: false })
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useAdmin = () => useSyncExternalStore(subscribe, () => state)
