import { useCallback, useEffect, useState } from 'react'
import { pullKey, pushSync } from '@/lib/sync'

export interface GithubAccount {
  username: string
  token?: string
}

function loadLocal(): GithubAccount | null {
  try {
    const raw = localStorage.getItem('ghhot:account')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** GitHub 账号信息：服务器多端同步 + localStorage 本地缓存 */
export function useGithubAccount() {
  const [account, setAccount] = useState<GithubAccount | null>(loadLocal)

  useEffect(() => {
    pullKey<GithubAccount>('account').then((v) => {
      if (v) setAccount(v)
    })
  }, [])

  const save = useCallback((acc: GithubAccount) => {
    pushSync('account', acc)
    setAccount(acc)
  }, [])

  const clear = useCallback(() => {
    pushSync('account', null)
    localStorage.removeItem('ghhot:account')
    setAccount(null)
  }, [])

  return { account, save, clear }
}
