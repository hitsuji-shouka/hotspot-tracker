import { Link } from 'react-router'
import SiteNav from './SiteNav'
import './site-header.css'

export default function SiteHeader({ className = '' }: { className?: string }) {
  return <header className={`site-header ${className}`}>
    <Link to="/" className="site-brand" aria-label="羊宇宙漫游指南首页">
      <img src="/sheep-planet.png" alt="" />
      羊宇宙漫游指南
    </Link>
    <SiteNav />
  </header>
}
