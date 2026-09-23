import { useEffect, useState } from 'react'
import { LockKeyhole, LogOut } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminMessage, lockAdmin, refreshAdmin, unlockAdmin, useAdmin } from '@/lib/admin'

export function AdminSession() {
  const { message } = useAdmin()
  useEffect(() => {
    void refreshAdmin()
    const focus = () => { void refreshAdmin() }
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [])
  return message ? <div role="alert" className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] p-4 text-sm text-[#c9d1d9] shadow-lg"><span>{message}</span><button aria-label="关闭提示" className="ml-auto p-2" onClick={() => adminMessage('')}>×</button></div> : null
}

export default function AdminControl({ dark = false, locale = 'zh' }: { dark?: boolean; locale?: 'zh' | 'en' }) {
  const en = locale === 'en'
  const { canEdit, configured, ready } = useAdmin()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const close = (value: boolean) => { setOpen(value); setPassword(''); setError('') }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try { await unlockAdmin(password); close(false) }
    catch (error) { setError(en ? 'Unable to unlock. Check your password and connection, then try again.' : error instanceof Error ? error.message : '无法连接服务，请重试') }
    finally { setBusy(false); setPassword('') }
  }
  return <>
    <button className="inline-flex items-center gap-1.5 text-xs opacity-70 transition-opacity hover:opacity-100" disabled={busy} onClick={async () => {
      if (!canEdit) { close(true); void refreshAdmin(); return }
      setBusy(true)
      try { await lockAdmin() } catch { adminMessage(en ? 'Unable to sign out. Check your connection and try again.' : '退出失败，请检查网络后重试。') } finally { setBusy(false) }
    }}>{canEdit ? <LogOut className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{canEdit ? (en ? 'Sign Out' : '退出编辑') : (en ? 'Manage' : '管理')}</button>
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={dark ? 'border-[#30363d] bg-[#161b22] text-[#c9d1d9]' : 'border-[#e5e0d8] bg-[#faf9f6] text-[#26221c]'}>
        <DialogHeader><DialogTitle>{en ? 'Unlock Editing' : '解锁编辑'}</DialogTitle><DialogDescription className={dark ? 'text-[#8b949e]' : 'text-[#777268]'}>{en ? 'Your session lasts 30 days.' : '有效期 30 天'}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><label htmlFor="admin-password" className="text-sm">{en ? 'Admin password' : '管理密码'}</label><input id="admin-password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-md border border-current/20 bg-transparent px-3 py-2 text-base outline-offset-2" /></div>
          {ready && !configured && <p className="text-sm" role="status">{en ? 'Editing is not available yet.' : '暂未开放编辑'}</p>}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="rounded-md px-4 py-2 text-sm" onClick={() => close(false)}>{en ? 'Cancel' : '取消'}</button><button type="submit" disabled={busy || !configured || !password} className={'rounded-md px-4 py-2 text-sm text-white disabled:opacity-50 ' + (dark ? 'bg-[#238636]' : 'bg-[#c2410c]')}>{busy ? (en ? 'Checking…' : '验证中…') : (en ? 'Unlock' : '解锁')}</button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>
}
