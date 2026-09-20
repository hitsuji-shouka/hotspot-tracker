# 推送任务共享状态：记录上次推送时间与已推送条目，实现「距上次推送」增量窗口
import json
from datetime import datetime, timezone
from pathlib import Path

STATE_DIR = Path(__file__).parent / "state"
MAX_SEEN = 300  # 每个任务最多记住 300 条已推送 ID，防止文件无限增长


def _path(name: str) -> Path:
    return STATE_DIR / f"{name}.json"


def load(name: str) -> dict:
    p = _path(name)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return {}
    return {}


def save(name: str, state: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    _path(name).write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")


def pick_new(name: str, candidates: list[dict], id_key: str, count: int) -> tuple[list[dict], str | None, int]:
    """
    从候选列表中挑出「距上次推送以来未推过」的条目。
    返回 (选中的条目, 上次推送时间 ISO 或 None, 其中真正新增的条数)。
    新增不足 count 时用候选中其余条目按原顺序补足，保证榜单数量稳定。
    """
    state = load(name)
    prev_run = state.get("last_run")
    seen = set(state.get("seen", []))

    fresh = [c for c in candidates if str(c.get(id_key)) not in seen]
    stale = [c for c in candidates if str(c.get(id_key)) in seen]

    picked = fresh[:count]
    new_count = len(picked)
    if len(picked) < count:
        picked += stale[: count - len(picked)]

    # 记录本次推送：已推送集合 = 本次 + 历史（去重、截断）
    now = datetime.now(timezone.utc).isoformat()
    merged = [str(c.get(id_key)) for c in picked]
    merged += [s for s in state.get("seen", []) if s not in merged]
    save(name, {"last_run": now, "seen": merged[:MAX_SEEN]})

    return picked, prev_run, new_count


def window_text(prev_run: str | None) -> str:
    """把上次推送时间格式化成中文窗口描述"""
    if not prev_run:
        return "首次推送"
    try:
        prev = datetime.fromisoformat(prev_run).astimezone()
        return f"距上次推送（{prev.strftime('%m-%d %H:%M')}）以来"
    except Exception:  # noqa: BLE001
        return "距上次推送以来"
