# 热点追踪站数据快照生成器
# 抓取 skills.sh 排行榜 + 新浪财经 7x24 快讯 + HF 论文榜 + AI 新闻，写入网站数据目录
# 本地：写入 E 盘项目的 public/data 与 dist/data
# 服务器：设置 HOTSPOT_DATA_DIR 环境变量后只写该目录
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
_env_out = os.environ.get("HOTSPOT_DATA_DIR")
if _env_out:
    OUT_DIRS = [Path(_env_out)]
else:
    SITE_ROOT = Path(r"E:\AGENT\KIMI\hotspot-tracker")
    OUT_DIRS = [SITE_ROOT / "public" / "data", SITE_ROOT / "dist" / "data"]

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def fetch(url: str, referer: str | None = None) -> str:
    headers = dict(UA)
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "ignore")


def parse_installs(text: str) -> int:
    """'3.5M' -> 3500000, '215k' -> 215000, '1,234' -> 1234"""
    text = text.strip().replace(",", "")
    m = re.match(r"([\d.]+)\s*([kKmM]?)", text)
    if not m:
        return 0
    n = float(m.group(1))
    suffix = m.group(2).lower()
    if suffix == "m":
        n *= 1_000_000
    elif suffix == "k":
        n *= 1_000
    return int(n)


def scrape_skills() -> list[dict]:
    html = fetch("https://skills.sh/")
    rows = re.findall(
        r'<a class="group grid[^>]*href="(/[\w.~-]+/[\w.~-]+/[\w.~-]+)"[^>]*>(.*?)</a>',
        html,
        re.S,
    )
    items = []
    for href, body in rows[:100]:
        name_m = re.search(r"<h3[^>]*>([^<]+)</h3>", body)
        text = re.sub(r"<[^>]+>", " ", body)
        text = re.sub(r"\s+", " ", text).strip()
        # 文本形如: "13 vercel-react-best-practices vercel-labs/agent-skills 3.5M"
        parts = text.split(" ")
        rank = None
        installs = 0
        source = ""
        if parts and parts[0].isdigit():
            rank = int(parts[0])
        for p in reversed(parts):
            if re.match(r"^[\d,.]+[kKmM]?$", p):
                installs = parse_installs(p)
                break
        for p in parts:
            if "/" in p and not p.startswith("/"):
                source = p
                break
        if not name_m:
            continue
        name = name_m.group(1).strip()
        seg = href.strip("/").split("/")
        if len(seg) >= 2:
            source = f"{seg[0]}/{seg[1]}"
        items.append(
            {
                "rank": rank,
                "name": name,
                "source": source,
                "installs": installs,
                "url": f"https://skills.sh{href}",
                "github": f"https://github.com/{source}",
            }
        )
    return items


def scrape_finance() -> list[dict]:
    raw = fetch(
        "https://zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=30&zhibo_id=152&tag_id=0&dire=f&dpc=1&pagesize=30&type=0",
        referer="https://finance.sina.com.cn/",
    )
    d = json.loads(raw)
    feeds = d.get("result", {}).get("data", {}).get("feed", {}).get("list", [])
    items = []
    for f in feeds:
        text = (f.get("rich_text") or "").strip()
        if not text:
            continue
        text = re.sub(r"\s+", " ", text)
        # 去掉链接等富文本标记
        text = re.sub(r"https?://\S+", "", text).strip()
        items.append(
            {
                "time": f.get("create_time") or "",
                "text": text,
                "tags": [t.get("name") for t in (f.get("tag") or []) if t.get("name")],
            }
        )
    return items


def scrape_ai_news() -> list[dict]:
    """AI 领域新闻：量子位（中文）+ Hacker News 首页（英文）双源合并"""
    items: list[dict] = []

    # 量子位 WordPress REST API
    try:
        posts = json.loads(fetch("https://www.qbitai.com/wp-json/wp/v2/posts?per_page=15"))
        for p in posts:
            title = re.sub(r"<[^>]+>", "", p.get("title", {}).get("rendered", "")).strip()
            excerpt = re.sub(r"<[^>]+>", "", p.get("excerpt", {}).get("rendered", "")).strip()
            excerpt = re.sub(r"\s+", " ", excerpt)
            if len(excerpt) > 160:
                excerpt = excerpt[:160] + "…"
            if not title:
                continue
            items.append(
                {
                    "source": "量子位",
                    "time": (p.get("date") or "").replace("T", " "),
                    "title": title,
                    "text": excerpt or None,
                    "url": p.get("link") or "",
                    "points": None,
                }
            )
    except Exception as e:  # noqa: BLE001
        print(f"量子位抓取失败: {e}")

    # Hacker News 首页榜（Algolia 官方 API）
    try:
        d = json.loads(fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12"))
        for h in d.get("hits", []):
            title = (h.get("title") or "").strip()
            if not title:
                continue
            items.append(
                {
                    "source": "Hacker News",
                    "time": (h.get("created_at") or "").replace("T", " ")[:19],
                    "title": title,
                    "text": None,
                    "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                    "points": h.get("points"),
                }
            )
    except Exception as e:  # noqa: BLE001
        print(f"Hacker News 抓取失败: {e}")

    return items


PAPERS_SOURCES = [
    "https://huggingface.co/api/papers?limit=30",
    "https://hf-mirror.com/api/papers?limit=30",  # 国内镜像兜底
]


def scrape_papers() -> list[dict]:
    """Hugging Face Papers 每日榜，按 upvotes 排序取 Top 20"""
    data = None
    last_err = None
    for url in PAPERS_SOURCES:
        try:
            data = json.loads(fetch(url))
            if isinstance(data, list) and data:
                break
        except Exception as e:  # noqa: BLE001
            last_err = e
    if not data:
        raise RuntimeError(f"论文接口不可用: {last_err}")

    top = sorted(data, key=lambda p: p.get("upvotes", 0), reverse=True)[:20]
    items = []
    for p in top:
        pid = p.get("id", "")
        abstract = (p.get("summary") or "").strip().replace("\n", " ")
        if len(abstract) > 200:
            abstract = abstract[:200] + "…"
        authors = [a.get("name", "") for a in p.get("authors", []) if a.get("name")]
        items.append(
            {
                "id": pid,
                "title": (p.get("title") or "未命名").strip(),
                "url": f"https://huggingface.co/papers/{pid}",
                "arxiv": f"https://arxiv.org/abs/{pid}",
                "upvotes": p.get("upvotes", 0),
                "publishedAt": (p.get("publishedAt") or "")[:10],
                "authors": authors[:5],
                "abstract": abstract or None,
                "thumbnail": p.get("thumbnailUrl"),
            }
        )
    return items


def main() -> dict:
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    skills = scrape_skills()
    finance = scrape_finance()
    papers = scrape_papers()
    ai_news = scrape_ai_news()

    skills_json = {"updatedAt": now, "source": "skills.sh", "count": len(skills), "items": skills}
    finance_json = {"updatedAt": now, "source": "新浪财经 7x24", "count": len(finance), "items": finance}
    papers_json = {"updatedAt": now, "source": "Hugging Face Papers", "count": len(papers), "items": papers}
    ai_news_json = {"updatedAt": now, "source": "量子位 · Hacker News", "count": len(ai_news), "items": ai_news}

    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "skills.json").write_text(json.dumps(skills_json, ensure_ascii=False, indent=1), encoding="utf-8")
        (d / "finance.json").write_text(json.dumps(finance_json, ensure_ascii=False, indent=1), encoding="utf-8")
        (d / "papers.json").write_text(json.dumps(papers_json, ensure_ascii=False, indent=1), encoding="utf-8")
        (d / "ai_news.json").write_text(json.dumps(ai_news_json, ensure_ascii=False, indent=1), encoding="utf-8")

    return {
        "updatedAt": now,
        "skillsCount": len(skills),
        "financeCount": len(finance),
        "papersCount": len(papers),
        "aiNewsCount": len(ai_news),
    }


# 支持两种用法：直接 python 运行，或被 Blueprint Automation 以 run(ctx) 调用
def run(ctx=None):
    stats = main()
    summary = (
        f"热点追踪站数据已更新：skills.sh 榜单 {stats['skillsCount']} 个，"
        f"财经快讯 {stats['financeCount']} 条，热点论文 {stats['papersCount']} 篇，"
        f"AI 新闻 {stats['aiNewsCount']} 条（{stats['updatedAt']}）"
    )
    return {"artifact": {**stats, "summary": summary}}


if __name__ == "__main__":
    result = main()
    print(json.dumps(result, ensure_ascii=False))
