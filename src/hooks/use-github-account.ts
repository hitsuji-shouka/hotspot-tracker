import { useCallback, useState } from 'react'

export interface GithubAccount {
  username: string
  token?: string
}

const KEY = 'ghhot:account'

function load(): GithubAccount | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** GitHub 账号信息（用户名 + 可选 Token），localStorage 持久化 */
export function useGithubAccount() {
  const [account, setAccount] = useState<GithubAccount | null>(load)

  const save = useCallback((acc: GithubAccount) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(acc))
    } catch {
      /* ignore */
    }
    setAccount(acc)
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(KEY)
    setAccount(null)
  }, [])

  return { account, save, clear }
}
