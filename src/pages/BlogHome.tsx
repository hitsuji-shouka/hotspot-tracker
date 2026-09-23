import AdminControl from '@/components/AdminControl'
// 博客首页 v2：极简编辑风（灵感：addyosmani.com）
// 浅色暖底 + 自我介绍 + 精选项目
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchUserRepos, formatNumber, type Repo } from '@/lib/github'
import SiteNav from '@/components/SiteNav'
import { ArrowUpRight, Flame, Github, Mail, MapPin, Star } from 'lucide-react'

const GITHUB_USER = 'hitsuji-shouka'

/** 首页公开介绍 */
const PROFILE = {
  name: '羊宇宙',
  tagline: '复旦大学 · AI Agent / 后端开发',
  introPre: '你好，我是 ',
  introName: '羊宇宙',
  introPost: '。',
  introLine2: '喜欢探究技术，也喜欢感受故事。',
  introParagraphs: [
    '我热衷于 AI Agent 与后端技术，喜欢探究智能体如何理解问题、使用工具，也关心支撑它们的系统如何做到可靠、高效。这里记录我从原理到实践的探索，以及构建过程中遇到的问题与思考。',
    '技术之外，我也喜欢在文学、电影和音乐里漫游，记录那些让我停留、回味或产生新想法的作品。',
    '欢迎来到我的「羊宇宙漫游指南」，一起探索技术，也交换关于世界的感受。',
  ],
  location: '上海',
  email: '2483346490@qq.com',
}

const EXPERIENCE = [
  { period: '2026.05 – 2026.08', title: '蚂蚁 · 财富 AI Lab · 智能体与大模型应用开发' },
  { period: '2025.11 – 2026.04', title: '蔚来 · 能源数智化 · Java 后端开发' },
]

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

export default function BlogHome() {
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    document.title = '羊宇宙漫游指南'
    fetchUserRepos(GITHUB_USER)
      .then((list) => setRepos([...list].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6)))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      {/* 顶部导航 */}
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg hover:text-[#c2410c] transition-colors">
          <img src="/sheep-planet.png" alt="返回首页" className="w-6 h-6 object-contain" />
          羊宇宙漫游指南
        </Link>
        <SiteNav />
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {/* 大字段我介绍 */}
        <section className="pt-6 pb-10 sm:pt-8">
          <div className="flex items-center gap-4 mb-8">
            <img
              src="/profile-avatar.png"
              alt={PROFILE.name}
              width={56}
              height={56}
              loading="eager"
              fetchPriority="high"
              className="h-14 w-14 shrink-0 rounded-full"
            />
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
            <br />
            {PROFILE.introLine2}
          </p>
          <div className="mt-6 space-y-4 text-[15px] sm:text-base leading-[1.9] text-[#57534a]">
            {PROFILE.introParagraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
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
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* 项目 */}
        {repos.length > 0 && (
          <section id="projects" className="py-8 border-t" style={{ borderColor: BORDER }}>
            <h2 className="font-serif text-xl font-bold mb-6">项目</h2>
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
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {PROFILE.email}
            </span>
          </div>
          <div className="mt-3"><AdminControl /></div>
        </footer>
      </main>
    </div>
  )
}
