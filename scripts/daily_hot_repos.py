# GitHub 今日热门项目 Top 10
# 抓取当日（不足时回退近 7 天）新创建的高星开源项目，生成中文摘要
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone


def gh_search(days: int, per_page: int = 10):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    q = f"created:>{since} stars:>10"
    url = (
        "https://api.github.com/search/repositories?q="
        + urllib.parse.quote(q)
        + f"&sort=stars&order=desc&per_page={per_page}"
    )
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "daily-hot-repos"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run(ctx):
    window_days = 3
    data = gh_search(3)
    items = data.get("items", [])
    if len(items) < 10:  # 近 3 天不足时回退到近 7 天
        window_days = 7
        data = gh_search(7)
        items = data.get("items", [])

    top = items[:10]
    today = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")

    result_items = []
    lines = [f"# 🔥 GitHub 今日热门项目 Top 10（{today}）", ""]
    if window_days == 3:
        lines.append(f"近 3 天新创建的热门开源项目，共 {data.get('total_count', 0)} 个，按 Star 排序 Top {len(top)}：")
    else:
        lines.append(f"近 3 天新增较少，展示近 7 天新星项目 Top {len(top)}：")
    lines.append("")

    for i, r in enumerate(top, 1):
        name = r.get("full_name", "")
        url = r.get("html_url", "")
        stars = r.get("stargazers_count", 0)
        forks = r.get("forks_count", 0)
        lang = r.get("language") or "—"
        desc = (r.get("description") or "暂无描述").strip().replace("\n", " ")
        if len(desc) > 90:
            desc = desc[:90] + "…"
        lines.append(f"{i}. **[{name}]({url})** ⭐{stars} · 🍴{forks} · {lang}")
        lines.append(f"   {desc}")
        lines.append("")
        result_items.append(
            {"name": name, "url": url, "stars": stars, "description": r.get("description"), "language": r.get("language")}
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
