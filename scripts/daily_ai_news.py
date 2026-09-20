# 每日 AI 要闻 Top10 推送（增量推送）
# 候选池：量子位最新 + Hacker News 首页最热，每次只推距上次推送以来未推过的新闻
import json
import re
import urllib.request
from datetime import datetime, timezone

from push_state import pick_new, window_text

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "ignore")


def qbitai_top(n: int = 3) -> list[dict]:
    posts = json.loads(fetch(f"https://www.qbitai.com/wp-json/wp/v2/posts?per_page={n}"))
    items = []
    for p in posts:
        title = re.sub(r"<[^>]+>", "", p.get("title", {}).get("rendered", "")).strip()
        excerpt = re.sub(r"<[^>]+>", "", p.get("excerpt", {}).get("rendered", "")).strip()
        excerpt = re.sub(r"\s+", " ", excerpt)
        if len(excerpt) > 90:
            excerpt = excerpt[:90] + "…"
        if title:
            items.append({"source": "量子位", "title": title, "text": excerpt, "url": p.get("link") or "", "points": None})
    return items


def hn_top(n: int = 2) -> list[dict]:
    d = json.loads(fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15"))
    hits = sorted(d.get("hits", []), key=lambda h: h.get("points") or 0, reverse=True)[:n]
    items = []
    for h in hits:
        title = (h.get("title") or "").strip()
        if title:
            items.append(
                {
                    "source": "Hacker News",
                    "title": title,
                    "text": None,
                    "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                    "points": h.get("points"),
                }
            )
    return items


def run(ctx):
    today = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")
    qb_pool: list[dict] = []
    hn_pool: list[dict] = []
    errors = []
    try:
        qb_pool = qbitai_top(10)
    except Exception as e:  # noqa: BLE001
        errors.append(f"量子位: {e}")
    try:
        hn_pool = hn_top(10)
    except Exception as e:  # noqa: BLE001
        errors.append(f"Hacker News: {e}")
    if not qb_pool and not hn_pool:
        raise RuntimeError(f"AI 新闻源全部不可用: {'; '.join(errors)}")

    # 每个来源独立做增量筛选，各取 5 条，保证双源均衡不互相挤占
    qb_items, prev_run, qb_new = pick_new("ai_news_qbitai", qb_pool, "url", 5)
    hn_items, _, hn_new = pick_new("ai_news_hn", hn_pool, "url", 5)
    items = qb_items + hn_items
    new_count = qb_new + hn_new

    lines = [f"# 🤖 AI 今日要闻 Top{len(items)}（{today}）", ""]
    lines.append(
        f"{window_text(prev_run)}：量子位最新报道 + Hacker News 社区最热，"
        f"其中 {new_count} 条是首次推送的新要闻："
    )
    lines.append("")
    for i, n in enumerate(items, 1):
        tag = "🇨🇳" if n["source"] == "量子位" else "🟧"
        heat = f" · 🔥{n['points']}" if n.get("points") else ""
        lines.append(f"{i}. {tag} **[{n['title']}]({n['url']})**{heat}")
        if n.get("text"):
            lines.append(f"   {n['text']}")
        lines.append("")

    summary = "\n".join(lines)
    return {"artifact": {"date": today, "count": len(items), "summary": summary, "items": items}}
