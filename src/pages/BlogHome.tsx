// 博客首页 v2：极简编辑风（灵感：addyosmani.com）
// 浅色暖底 + 大字自我介绍 + 经历时间线 + 精选项目 + 博文
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchUser, fetchUserRepos, formatNumber, type GithubUser, type Repo } from '@/lib/github'
import { posts } from '@/lib/posts'
import { ArrowUpRight, Flame, Github, Mail, MapPin, Star } from 'lucide-react'

const GITHUB_USER = 'hitsuji-shouka'

/** 个人资料（依据简历整理） */
const PROFILE = {
  name: '杨胜翔',
  tagline: '复旦大学硕士 · AI Agent / 后端开发',
  introPre: '你好，我是 ',
  introName: '杨胜翔',
  introPost:
    '，复旦大学电子信息硕士在读（2027 届）。我专注于 AI Agent 与后端开发，曾在蚂蚁集团财富 AI Lab 和蔚来实习。这里是我的数字自留地：记录项目与论文，也帮你追踪每天的技术热点。',
  location: '上海',
  email: '2483346490@qq.com',
}

const EDUCATION = [
  {
    period: '2024 – 2027',
    title: '复旦大学 · 电子信息 · 硕士',
    detail: 'GPA 3.67/4.0 · 核心课程：人工智能的数学基础（A）、机器学习（A）、数据分析与算法设计（A）',
  },
  {
    period: '2019 – 2023',
    title: '上海大学 · 通信工程 · 本科',
    detail: 'CET-6 545 · 核心课程：数据结构、计算机网络、信号与系统',
  },
]

const EXPERIENCE = [
  {
    period: '2026.05 – 2026.08',
    title: '蚂蚁集团 · 财富 AI Lab · 智能体与大模型应用开发',
    detail:
      '负责财富 APP 的 AI 内容生产与个性化解读后端：打通 A/B 实验全链路，落地三类个性化 PUSH（个股公告覆盖近百万用户，账户复盘 UV CTR 相对提升 15.7%），治理 1,500 UID/s 峰值下的高并发触达。',
  },
  {
    period: '2025.11 – 2026.04',
    title: '蔚来 · 能源数智化 · Java 后端开发',
    detail:
      '负责 OCC 事件分配与升级、换电支付单管理等后端系统；基于 AgentScope Java 构建智能辅助做单 Agent，实现 Skill 编排、流式交互与人工确认（HITL）机制。',
  },
]

const PUBLICATIONS = [
  'BCGFMamba: Boundary-Context Guided Feature Fusion Mamba for Postoperative Glioma Residual Tumor Segmentation — ICBIP 2026（已录用）',
  'Latent Domain-Specific Prompt-Driven SAM via Conditional Diffusion Refinement for Postoperative Glioma Segmentation — IEEE TII 2026（已录用）',
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

          <h3 className="text-xs font-semibold tracking-widest text-[#a39e93] mt-8 mb-3">科研论文</h3>
          <ul className="space-y-2.5">
            {PUBLICATIONS.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm text-[#6b655c] leading-relaxed">
                <span style={{ color: ACCENT }} className="shrink-0">▪</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
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
            <a href={`mailto:${PROFILE.email}`} className="flex items-center gap-1 hover:text-[#26221c] transition-colors">
              <Mail className="w-3.5 h-3.5" /> 邮箱
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
