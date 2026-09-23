import { useCallback, useState } from 'react'

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

/** GitHub 账号与 token 仅保存在当前浏览器，不能进入公开收藏接口。 */
export function useGithubAccount() {
  const [account, setAccount] = useState<GithubAccount | null>(loadLocal)

  const save = useCallback((acc: GithubAccount) => {
    localStorage.setItem('ghhot:account', JSON.stringify(acc))
    setAccount(acc)
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem('ghhot:account')
    setAccount(null)
  }, [])

  return { account, save, clear }
}
