# 每日热点论文抓取
# 从 Hugging Face Papers 抓取当日热门论文（按 upvotes 排序），生成中文摘要
import json
import time
import urllib.request
from datetime import datetime, timezone

SOURCES = [
    "https://huggingface.co/api/papers?limit=30",
    "https://hf-mirror.com/api/papers?limit=30",  # 国内镜像兜底
]


def fetch_papers():
    last_err = None
    for url in SOURCES:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (daily-hot-papers)"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, list) and data:
                    return data
            except Exception as e:  # noqa: BLE001
                last_err = e
                time.sleep(2)
    raise RuntimeError(f"论文接口不可用: {last_err}")


def run(ctx):
    papers = fetch_papers()
    top = sorted(papers, key=lambda p: p.get("upvotes", 0), reverse=True)[:10]
    today = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")

    result_items = []
    lines = [f"# 📄 今日热点论文（{today}）", ""]
    lines.append(f"来自 Hugging Face Papers 每日榜，按社区投票排序，Top {len(top)}：")
    lines.append("")

    for i, p in enumerate(top, 1):
        pid = p.get("id", "")
        title = (p.get("title") or "未命名").strip()
        votes = p.get("upvotes", 0)
        published = (p.get("publishedAt") or "")[:10]
        authors = [a.get("name", "") for a in p.get("authors", []) if a.get("name")]
        author_str = ", ".join(authors[:3]) + (" 等" if len(authors) > 3 else "")
        abstract = (p.get("summary") or "").strip().replace("\n", " ")
        if len(abstract) > 120:
            abstract = abstract[:120] + "…"
        url = f"https://huggingface.co/papers/{pid}"
        arxiv_url = f"https://arxiv.org/abs/{pid}"

        lines.append(f"{i}. **[{title}]({url})** 👍{votes} · {published}")
        if author_str:
            lines.append(f"   作者：{author_str}")
        if abstract:
            lines.append(f"   {abstract}")
        lines.append(f"   [arXiv 原文]({arxiv_url})")
        lines.append("")

        result_items.append(
            {
                "id": pid,
                "title": title,
                "url": url,
                "arxiv": arxiv_url,
                "upvotes": votes,
                "publishedAt": published,
                "authors": authors[:5],
                "abstract": abstract or None,
            }
        )

    summary = "\n".join(lines)
    return {
        "artifact": {
            "date": today,
            "count": len(result_items),
            "summary": summary,
            "items": result_items,
        }
    }
