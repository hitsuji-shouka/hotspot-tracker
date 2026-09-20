// 博客首页 v2：极简编辑风（灵感：addyosmani.com）
// 浅色暖底 + 大字自我介绍 + 经历时间线 + 精选项目 + 博文
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchUser, fetchUserRepos, formatNumber, type GithubUser, type Repo } from '@/lib/github'
import { posts } from '@/lib/posts'
import { ArrowUpRight, Flame, Github, Mail, MapPin, Star } from 'lucide-react'

const GITHUB_USER = 'hitsuji-shouka'

/** 个人资料：真实信息由本人提供后更新 */
const PROFILE = {
  name: 'yang-shengxiang',
  tagline: '专注 AI Agent 与后端开发',
  introPre: '你好，我是 ',
  introName: '盛翔',
  introPost:
    '，一名住在上海的开发者。我着迷于 AI Agent 和一切能让开发变得更优雅的工具。这个网站是我的数字自留地：记录项目、分享想法，也帮你追踪每天的技术热点。',
  location: '上海',
}

const EDUCATION = [
  { period: '20XX – 20XX', title: 'XX 大学 · 计算机科学（示例）', detail: '主修课程：数据结构、操作系统、分布式系统（发我真实信息替换）' },
]

const EXPERIENCE = [
  { period: '20XX.XX – 20XX.XX', title: 'XX 公司 · 后端开发实习生（示例）', detail: '负责 XX 系统的设计与落地，做了 XX 事情（发我真实信息替换）' },
]

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

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
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      {/* 顶部导航 */}
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <span className="font-serif font-bold text-lg">{PROFILE.name}</span>
        <nav className="flex items-center gap-5 text-[#6b655c]">
          <a href="#posts" className="hover:text-[#26221c] transition-colors">博文</a>
          <a href="#projects" className="hover:text-[#26221c] transition-colors">项目</a>
          <Link to="/hotspot" className="flex items-center gap-1 hover:text-[#26221c] transition-colors">
            <Flame className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            热点追踪站
          </Link>
          <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer" aria-label="GitHub">
            <Github className="w-4 h-4 hover:text-[#26221c] transition-colors" />
          </a>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {/* 大字段我介绍 */}
        <section className="pt-14 pb-10">
          <div className="flex items-center gap-4 mb-8">
            {user?.avatar_url && (
              <img src={user.avatar_url} alt={PROFILE.name} className="w-14 h-14 rounded-full" />
            )}
            <div className="text-sm text-[#6b655c]">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {PROFILE.location}
              </div>
              <div className="mt-0.5">{PROFILE.tagline}</div>
            </div>
          </div>
          <p className="font-serif text-[26px] sm:text-[32px] leading-[1.5] font-medium text-[#1d1a15]">
            {PROFILE.introPre}
            <span style={{ color: ACCENT }}>{PROFILE.introName}</span>
            {PROFILE.introPost}
          </p>
        </section>

        {/* 经历 */}
        <section className="py-8 border-t" style={{ borderColor: BORDER }}>
          <h2 className="font-serif text-xl font-bold mb-6">经历</h2>

          <h3 className="text-xs font-semibold tracking-widest text-[#a39e93] mb-3">实习经历</h3>
          <div className="space-y-4 mb-8">
            {EXPERIENCE.map((e) => (
              <div key={e.title} className="flex gap-4">
                <div className="w-28 shrink-0 text-xs text-[#a39e93] pt-1 font-mono">{e.period}</div>
                <div>
                  <div className="font-semibold text-[15px]">{e.title}</div>
                  <div className="text-sm text-[#6b655c] mt-0.5 leading-relaxed">{e.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold tracking-widest text-[#a39e93] mb-3">教育经历</h3>
          <div className="space-y-4">
            {EDUCATION.map((e) => (
              <div key={e.title} className="flex gap-4">
                <div className="w-28 shrink-0 text-xs text-[#a39e93] pt-1 font-mono">{e.period}</div>
                <div>
                  <div className="font-semibold text-[15px]">{e.title}</div>
                  <div className="text-sm text-[#6b655c] mt-0.5 leading-relaxed">{e.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 精选项目 */}
        {repos.length > 0 && (
          <section id="projects" className="py-8 border-t" style={{ borderColor: BORDER }}>
            <h2 className="font-serif text-xl font-bold mb-6">精选项目</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {repos.map((r) => (
                <a
                  key={r.id}
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border bg-white px-5 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[15px] truncate" style={{ color: ACCENT }}>
                      {r.full_name.split('/')[1] ?? r.full_name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[#a39e93] group-hover:text-[#26221c] shrink-0 transition-colors" />
                  </div>
                  <p className="text-sm text-[#6b655c] mt-1.5 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                    {r.description ?? '暂无描述'}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-[#a39e93]">
                    <span className="flex items-center gap-1">
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

        {/* 博文 */}
        <section id="posts" className="py-8 border-t" style={{ borderColor: BORDER }}>
          <h2 className="font-serif text-xl font-bold mb-6">博文</h2>
          <div className="space-y-1">
            {posts.map((p) => (
              <Link
                key={p.slug}
                to={`/post/${p.slug}`}
                className="group flex items-baseline gap-4 py-3 border-b last:border-0 hover:bg-white/60 -mx-3 px-3 rounded-lg transition-colors"
                style={{ borderColor: BORDER }}
              >
                <span className="text-xs text-[#a39e93] font-mono shrink-0 w-20">{p.date}</span>
                <div className="min-w-0">
                  <span className="font-medium text-[15px] group-hover:underline underline-offset-4" style={{ textDecorationColor: ACCENT }}>
                    {p.title}
                  </span>
                  {p.summary && (
                    <span className="block text-sm text-[#6b655c] mt-0.5 line-clamp-1">{p.summary}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 页脚 */}
        <footer className="pt-10 mt-6 border-t text-sm text-[#a39e93] flex items-center justify-between flex-wrap gap-3" style={{ borderColor: BORDER }}>
          <span>© 2026 {PROFILE.name}</span>
          <div className="flex items-center gap-4">
            <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#26221c] transition-colors">
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            <Link to="/hotspot" className="flex items-center gap-1 hover:text-[#26221c] transition-colors">
              <Flame className="w-3.5 h-3.5" /> 热点追踪站
            </Link>
            <a href="mailto:hi@hitsuji-shouka.com" className="flex items-center gap-1 hover:text-[#26221c] transition-colors">
              <Mail className="w-3.5 h-3.5" /> 邮箱
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
