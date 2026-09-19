import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RepoCard from '@/components/RepoCard'
import { useGithubAccount } from '@/hooks/use-github-account'
import {
  fetchUser,
  fetchUserRepos,
  fetchUserStarred,
  RateLimitError,
  type GithubUser,
  type Repo,
} from '@/lib/github'
import { AlertTriangle, Github, KeyRound, LogOut, RefreshCw, Star, FolderGit2 } from 'lucide-react'

interface Props {
  keyword: string
  isFavorite: (id: number) => boolean
  onToggleFavorite: (repo: Repo) => void
}

export default function MyGithub({ keyword, isFavorite, onToggleFavorite }: Props) {
  const { account, save, clear } = useGithubAccount()
  const [user, setUser] = useState<GithubUser | null>(null)
  const [tab, setTab] = useState<'repos' | 'starred'>('repos')
  const [repos, setRepos] = useState<Repo[]>([])
  const [starred, setStarred] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 登录表单状态
  const [inputName, setInputName] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  const load = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      const [u, r, s] = await Promise.all([
        fetchUser(account.username, account.token),
        fetchUserRepos(account.username, account.token),
        fetchUserStarred(account.username, account.token),
      ])
      setUser(u)
      setRepos(r)
      setStarred(s)
    } catch (e) {
      if (e instanceof RateLimitError) {
        setError(
          `GitHub API 限流了${e.resetAt ? `，约 ${e.resetAt.toLocaleTimeString()} 恢复` : ''}。填写 Token 可将额度提升到每小时 5000 次。`,
        )
      } else {
        setError(e instanceof Error ? e.message : '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => {
    load()
  }, [load])

  const connect = async () => {
    const username = inputName.trim()
    const token = inputToken.trim() || undefined
    if (!username && !token) return
    setConnecting(true)
    setError(null)
    try {
      // 先验证账号有效性
      const u = await fetchUser(username, token)
      save({ username: u.login, token })
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接失败，请检查用户名')
    } finally {
      setConnecting(false)
    }
  }

  // ─── 未连接：登录表单 ───
  if (!account) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
          <div className="text-center space-y-1">
            <Github className="w-10 h-10 mx-auto text-white" />
            <h2 className="text-lg font-bold text-white">连接你的 GitHub</h2>
            <p className="text-sm text-[#8b949e]">
              输入用户名即可查看你的公开仓库和 Star 列表；填写 Token 可额外查看私有仓库并提升请求额度
            </p>
          </div>

          <div className="space-y-3">
            <Input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="GitHub 用户名"
              className="bg-[#0d1117] border-[#30363d]"
              onKeyDown={(e) => e.key === 'Enter' && connect()}
            />
            <div className="space-y-1.5">
              <Input
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Personal Access Token（可选）"
                type="password"
                className="bg-[#0d1117] border-[#30363d]"
                onKeyDown={(e) => e.key === 'Enter' && connect()}
              />
              <p className="text-xs text-[#8b949e] flex items-start gap-1">
                <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Token 只保存在你自己的浏览器本地。创建方式：GitHub → Settings → Developer
                  settings → Personal access tokens，勾选 repo 权限即可
                </span>
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-3 py-2 text-sm text-[#e3b341]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={connect}
            disabled={connecting || (!inputName.trim() && !inputToken.trim())}
            className="w-full bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            {connecting ? '连接中…' : '连接 GitHub'}
          </Button>
        </div>
      </div>
    )
  }

  // ─── 已连接：仓库列表 ───
  const list = (tab === 'repos' ? repos : starred).filter((r) => {
    const k = keyword.trim().toLowerCase()
    if (!k) return true
    return (
      r.full_name.toLowerCase().includes(k) ||
      (r.description ?? '').toLowerCase().includes(k)
    )
  })

  return (
    <div className="space-y-5">
      {/* 用户信息条 */}
      <div className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] p-4 flex-wrap">
        {user ? (
          <img src={user.avatar_url} alt={user.login} className="w-12 h-12 rounded-full" />
        ) : (
          <Skeleton className="w-12 h-12 rounded-full bg-[#0d1117]" />
        )}
        <div className="min-w-0">
          <div className="font-bold text-white">{user?.name || user?.login || account.username}</div>
          {user && (
            <div className="text-xs text-[#8b949e]">
              @{user.login} · {user.public_repos} 个公开仓库 · {user.followers} 位关注者
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            disabled={loading}
            className="border-[#30363d] text-[#c9d1d9]"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clear}
            className="border-[#30363d] text-[#8b949e]"
          >
            <LogOut className="w-4 h-4 mr-1" />
            退出
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'repos' | 'starred')}>
        <TabsList className="bg-[#161b22] border border-[#30363d]">
          <TabsTrigger value="repos">
            <FolderGit2 className="w-4 h-4 mr-1.5" />
            我的仓库 ({repos.length})
          </TabsTrigger>
          <TabsTrigger value="starred">
            <Star className="w-4 h-4 mr-1.5" />
            我 Star 的 ({starred.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] bg-[#161b22]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-[#8b949e]">
          <p className="text-4xl mb-3">🛸</p>
          <p>{keyword ? '没有匹配的仓库' : tab === 'repos' ? '还没有仓库' : '还没有 Star 任何仓库'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((repo, i) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              rank={i + 1}
              favorite={isFavorite(repo.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
