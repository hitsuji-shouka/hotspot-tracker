import { NavLink } from 'react-router'
import { Flame, Github } from 'lucide-react'

const GITHUB_USER = 'hitsuji-shouka'

const ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/shelf', label: '漫游' },
  { to: '/blog', label: '博客' },
]

export default function SiteNav() {
  return (
    <nav className="flex items-center gap-5 text-[#6b655c]">
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            `pb-0.5 border-b-2 transition-colors hover:text-[#26221c] ${
              isActive ? 'text-[#1d1a15] font-medium border-[#c2410c]' : 'border-transparent'
            }`
          }
        >
          {it.label}
        </NavLink>
      ))}
      <NavLink
        to="/hotspot"
        className={({ isActive }) =>
          `flex items-center gap-1 pb-0.5 border-b-2 transition-colors hover:text-[#26221c] ${
            isActive ? 'text-[#1d1a15] font-medium border-[#c2410c]' : 'border-transparent'
          }`
        }
      >
        <Flame className="w-3.5 h-3.5 text-[#c2410c]" />
        热点
      </NavLink>
      <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer" aria-label="GitHub">
        <Github className="w-4 h-4 hover:text-[#26221c] transition-colors" />
      </a>
    </nav>
  )
}
