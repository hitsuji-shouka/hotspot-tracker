import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, GitFork, CircleDot, Clock, Heart } from 'lucide-react'
import { formatNumber, timeAgo, type Repo } from '@/lib/github'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  C: '#555555',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Vue: '#41b883',
  HTML: '#e34c26',
  Ruby: '#701516',
  PHP: '#4F5D95',
}

export default function RepoCard({
  repo,
  rank,
  favorite,
  onToggleFavorite,
}: {
  repo: Repo
  rank: number
  favorite: boolean
  onToggleFavorite: (repo: Repo) => void
}) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? '#8b949e') : null
  return (
    <a href={repo.html_url} target="_blank" rel="noreferrer" className="block group">
      <Card className="h-full bg-[#161b22] border-[#30363d] hover:border-[#58a6ff]/60 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-9 h-9 rounded-md shrink-0"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] text-xs font-mono">#{rank}</span>
                <span className="font-semibold text-[#58a6ff] truncate group-hover:underline">
                  {repo.full_name}
                </span>
                <button
                  type="button"
                  aria-label={favorite ? '取消收藏' : '收藏'}
                  title={favorite ? '取消收藏' : '收藏'}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleFavorite(repo)
                  }}
                  className="ml-auto shrink-0 p-1 rounded-md hover:bg-[#30363d] transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      favorite
                        ? 'fill-[#f78166] text-[#f78166]'
                        : 'text-[#8b949e] hover:text-[#f78166]'
                    }`}
                  />
                </button>
              </div>
              <p className="text-sm text-[#c9d1d9]/80 mt-1 line-clamp-2 min-h-[2.5em]">
                {repo.description ?? '暂无描述'}
              </p>

              {repo.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {repo.topics.slice(0, 4).map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#8b949e]">
                {repo.language && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: langColor ?? '#8b949e' }}
                    />
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[#e3b341]">
                  <Star className="w-3.5 h-3.5" />
                  {formatNumber(repo.stargazers_count)}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  {formatNumber(repo.forks_count)}
                </span>
                <span className="flex items-center gap-1">
                  <CircleDot className="w-3.5 h-3.5" />
                  {formatNumber(repo.open_issues_count)}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  更新于 {timeAgo(repo.pushed_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}
