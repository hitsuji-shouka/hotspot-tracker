// 博客首页：GitHub 资料卡 + 精选项目 + 博文列表
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchUser, fetchUserRepos, formatNumber, type GithubUser, type Repo } from '@/lib/github'
import { posts } from '@/lib/posts'
import { Calendar, Flame, FolderGit2, Github, MapPin, Star, Tag, Users } from 'lucide-react'

const GITHUB_USER = 'hitsuji-shouka'

export default function BlogHome() {
  const [user, setUser] = useState<GithubUser | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    fetchUser(GITHUB_USER).then(setUser).catch(() => {})
    fetchUserRepos(GITHUB_USER)
      .then((list) => setRepos([...list].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6)))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* 资料卡 */}
        <section className="flex items-start gap-5">
          {user ? (
            <img src={user.avatar_url} alt={user.login} className="w-20 h-20 rounded-full border-2 border-[#30363d] shrink-0" />
          ) : (
            <Skeleton className="w-20 h-20 rounded-full bg-[#161b22] shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{user?.name ?? 'yang-shengxiang'}</h1>
            <a
              href={`https://github.com/${GITHUB_USER}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#58a6ff] hover:underline flex items-center gap-1 mt-0.5"
            >
              <Github className="w-3.5 h-3.5" />@{GITHUB_USER}
            </a>
            {user?.bio && <p className="text-sm text-[#8b949e] mt-2">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-[#8b949e] flex-wrap">
              {user?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {user.location}
                </span>
              )}
              {user && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {user.followers} followers · {user.following} following
                </span>
              )}
              {user && (
                <span className="flex items-center gap-1">
                  <FolderGit2 className="w-3 h-3" />
                  {user.public_repos} 个仓库
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 热点追踪站入口 */}
        <Link
          to="/hotspot"
          className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-gradient-to-r from-[#f78166]/10 to-[#a371f7]/10 px-5 py-4 hover:border-[#f78166]/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f78166] to-[#a371f7] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">热点追踪站</div>
            <div className="text-xs text-[#8b949e]">GitHub 项目 · Skills · 论文 · AI 新闻 · 财经，每日热点一站掌握</div>
          </div>
        </Link>

        {/* 精选项目 */}
        {repos.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-[#a371f7]" />
              精选项目
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {repos.map((r) => (
                <a
                  key={r.id}
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#a371f7]/50 transition-colors"
                >
                  <div className="font-semibold text-[#58a6ff] truncate">{r.full_name.split('/')[1] ?? r.full_name}</div>
                  <p className="text-xs text-[#8b949e] mt-1 line-clamp-2 min-h-[2rem]">{r.description ?? '暂无描述'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#8b949e]">
                    <span className="flex items-center gap-1 text-[#e3b341]">
                      <Star className="w-3 h-3" />
                      {formatNumber(r.stargazers_count)}
                    </span>
                    {r.language && <span>{r.language}</span>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 博文列表 */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">📝 博文</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-[#8b949e]">还没有文章，敬请期待。</p>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  to={`/post/${p.slug}`}
                  className="block rounded-lg border border-[#30363d] bg-[#161b22] px-5 py-4 hover:border-[#58a6ff]/50 transition-colors"
                >
                  <h3 className="font-semibold text-white leading-snug">{p.title}</h3>
                  {p.summary && <p className="text-sm text-[#8b949e] mt-1.5 line-clamp-2">{p.summary}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#8b949e] flex-wrap">
                    {p.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {p.date}
                      </span>
                    )}
                    {p.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff]">
                        <Tag className="w-2.5 h-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-[#8b949e] pt-6 pb-8 border-t border-[#30363d]">
          © 2026 {user?.name ?? GITHUB_USER} · 由热点追踪站驱动
        </footer>
      </main>
    </div>
  )
}
