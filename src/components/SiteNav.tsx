import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Flame, Github, Menu, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const GITHUB_USER = 'hitsuji-shouka'

const ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/shelf', label: '漫游' },
  { to: '/reading', label: '阅读' },
  { to: '/study', label: '学习' },
  { to: '/blog', label: '博客' },
]

function MobileMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 640px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="site-menu-toggle" aria-label="打开网站目录"><Menu size={23} strokeWidth={1.5} /></button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="site-menu-overlay" />
        <Dialog.Content className="site-menu-panel" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">网站目录</Dialog.Title>
          <div className="site-menu-header">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 font-serif font-bold text-lg text-[#26221c]">
              <img src="/sheep-planet.png" alt="" className="h-6 w-6 object-contain" />羊宇宙漫游指南
            </Link>
            <Dialog.Close asChild><button type="button" className="site-menu-toggle" aria-label="关闭网站目录"><X size={23} strokeWidth={1.5} /></button></Dialog.Close>
          </div>
          <nav aria-label="网站目录" className="site-menu-links">
            {[{ to: '/', label: '首页', end: true }, ...ITEMS, { to: '/hotspot', label: '热点' }].map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}>{item.label}</NavLink>
            ))}
            <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>GitHub <Github size={18} /></a>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function SiteNav() {
  const location = useLocation()
  return (
    <div className="site-nav shrink-0 text-[#6b655c]">
    <MobileMenu key={location.key} />
    <nav aria-label="主导航" className="hidden items-center gap-5 whitespace-nowrap sm:flex">
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
    </div>
  )
}
