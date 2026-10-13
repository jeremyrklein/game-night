"""Strip placeholder 'tied for last' positions from events where only the top
two finishers are actually known. Targets:
- 2018-02-24 (blackjack/poker)
- 2023-09-23 (poker)
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGETS = {
    "e2018-02-24": {"blackjack", "poker"},
    "e2023-09-23": {"poker"},
}


def patch(path: pathlib.Path) -> None:
    events = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for ev in events:
        if ev["id"] not in TARGETS:
            continue
        for g in ev.get("games", []):
            if g.get("gameId") not in TARGETS[ev["id"]]:
                continue
            positions = [r.get("position") for r in g.get("results", []) if isinstance(r.get("position"), int)]
            if not positions:
                continue
            last = max(positions)
            for r in g.get("results", []):
                if r.get("position") == last:
                    r.pop("position", None)
                    changed += 1
    path.write_text(json.dumps(events, indent=2) + "\n", encoding="utf-8")
    print(f"{path}: cleared {changed} placeholder positions")


for p in (ROOT / "data" / "events.json", ROOT / "public" / "data" / "events.json"):
    patch(p)
