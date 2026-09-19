# 每日热门 Skills 抓取
# 从 GitHub 搜索抓取新出现的热门 AI Agent Skill 仓库，生成中文摘要
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

CATEGORIES = [
    ("编程开发", "💻", ["code", "coding", "program", "debug", "refactor", "review", "dev"]),
    ("设计创意", "🎨", ["design", "ui", "poster", "image", "logo", "art"]),
    ("写作内容", "✍️", ["writ", "copywrit", "translat", "summar", "blog", "content"]),
    ("数据分析", "📊", ["data", "analy", "excel", "sheet", "chart", "sql", "pandas"]),
    ("音视频", "🎬", ["video", "audio", "music", "subtitle", "media"]),
    ("效率自动化", "⚡", ["automat", "workflow", "productiv", "schedule", "bot"]),
    ("科研学习", "🔬", ["research", "paper", "learn", "study", "academic", "literature"]),
    ("营销商业", "📈", ["market", "seo", "sales", "business", "ads", "growth"]),
    ("运维部署", "🛠️", ["devops", "deploy", "ci", "docker", "k8s", "monitor", "cloud"]),
]


def gh_search(days: int, per_page: int = 30):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    q = f"skill in:name,description topic:claude-skills created:>{since} stars:>2"
    url = (
        "https://api.github.com/search/repositories?q="
        + urllib.parse.quote(q)
        + f"&sort=stars&order=desc&per_page={per_page}"
    )
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "daily-hot-skills"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def classify(repo) -> str:
    text = ((repo.get("description") or "") + " " + repo.get("full_name", "")).lower()
    for label, emoji, kws in CATEGORIES:
        if any(k in text for k in kws):
            return f"{emoji} {label}"
    return "🧩 其他"


def run(ctx):
    window_days = 1
    data = gh_search(1)
    items = data.get("items", [])
    if len(items) < 3:  # 当日不足时回退到近 7 天
        window_days = 7
        data = gh_search(7)
        items = data.get("items", [])

    top = items[:10]
    today = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")

    result_items = []
    lines = [f"# 🧩 每日热门 Skills（{today}）", ""]
    if window_days == 1:
        lines.append(f"过去 24 小时新出现的热门 AI Agent Skills，共 {data.get('total_count', 0)} 个，以下为 Top {len(top)}：")
    else:
        lines.append(f"过去 24 小时新增较少，展示近 7 天新星 Skills Top {len(top)}：")
    lines.append("")

    for i, r in enumerate(top, 1):
        name = r.get("full_name", "")
        url = r.get("html_url", "")
        stars = r.get("stargazers_count", 0)
        lang = r.get("language") or "—"
        desc = (r.get("description") or "暂无描述").strip().replace("\n", " ")
        if len(desc) > 80:
            desc = desc[:80] + "…"
        cat = classify(r)
        lines.append(f"{i}. **[{name}]({url})** ⭐{stars} · {lang} · {cat}")
        lines.append(f"   {desc}")
        lines.append("")
        result_items.append(
            {"name": name, "url": url, "stars": stars, "description": r.get("description"), "language": r.get("language"), "category": cat}
        )

    summary = "\n".join(lines)
    return {
        "artifact": {
            "date": today,
            "window": f"{window_days}d",
            "count": len(result_items),
            "summary": summary,
            "items": result_items,
        }
    }
