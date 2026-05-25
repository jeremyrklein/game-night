"""One-off importer for the table-tennis tournament CSV.

Adds 6 events (2004-2007) plus new players + a `table-tennis` gameType.
"""
from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PUBLIC = ROOT / "public" / "data"

# Map source names to player IDs (existing + new).
# New players get pNN ids assigned below.
NEW_PLAYERS = [
    # name,                joinedYear, nickname
    ("Mick Tatcher",       2007, ""),
    ("Tila Reynolds",      2007, "Tila"),
    ("Geoff Brown",        2007, ""),
    ("Adam Close",         2007, ""),
    ("Dave Coleman",       2006, ""),
    ("Dan Klein",          2006, ""),
    ("Bryce",              2007, ""),
    ("Jason Lackey",       2004, ""),
]

ALIAS = {
    # Existing
    "mitch": "p04",
    "mitch stuard": "p04",
    "jeremy": "p02",
    "jeremy klein": "p02",
    "jer": "p02",
    "jer klein": "p02",
    "jake": "p01",
    "jake klein": "p01",
    "clark": "p03",
    "clark close": "p03",
    "jon": "p05",
    "jon hicks": "p05",
    # New (populated after id assignment)
}

# Tournament blocks: (date, format, rows)
TOURNAMENTS = [
    {
        "date": "2007-04-21",
        "title": "Round-robin (6 players)",
        # (position, source_name, wins, losses)
        "results": [
            (1, "Mitch",          6, 0),
            (2, "Jeremy",         6, 4),
            (3, "Jake",           4, 5),
            (4, "Mick Tatcher",   3, 4),
            (5, "Tila Reynolds",  2, 4),
            (6, "Geoff Brown",    0, 4),
        ],
        "notes": "Round-robin (6 players). W-L records as recorded.",
    },
    {
        "date": "2007-04-07",
        "title": "Round-robin + Tournament (9 players)",
        # (position, source_name, totalWins, totalLosses, pointDiff, points)
        "results_ext": [
            (1, "Jon Hicks",      15, 4, 33,  87),
            (2, "Mitch Stuard",   13, 8, 21,  79),
            (3, "Clark Close",    10, 4, 21,  77),
            (4, "Adam Close",      9, 8,  6,  72),
            (5, "Jake Klein",      8, 9, -17, 64),
            (6, "Dave Coleman",    8, 9,  19, 77),
            (7, "Jer Klein",       4, 8, -5,  75),
            (7, "Dan Klein",       3, 9, -8,  67),
            (7, "Geoff Brown",     0, 12,-71, 17),
        ],
        "notes": "Round-robin + single-elimination bracket. Totals from both phases.",
    },
    {
        "date": "2007-03-10",
        "title": "Single-elimination bracket (6 players)",
        # (position, source_name)
        "results_finish": [
            (1, "Jon"),
            (2, "Tila"),
            (3, "Jer"),
            (4, "Jake"),
            (5, "Bryce"),
            (6, "Geoff"),
        ],
        "notes": "Single-elimination bracket. Finishes only.",
    },
    {
        "date": "2006-07-22",
        "title": "Round-robin (5 players)",
        # (position, source_name, wins, losses, diff, points)
        "results_ext": [
            (1, "Clark Close",   10, 2, -1, 29),
            (2, "Mitch Stuard",   8, 4, 18, 45),
            (3, "Dave Coleman",   2, 6,  7, 34),
            (4, "Jake Klein",     3, 7,-14, 30),
            (5, "Dan Klein",      1, 7,-10, 29),
        ],
        "notes": "Round-robin (5 players).",
    },
    {
        "date": "2004-07-24",
        "title": "Bracket (winner: Clark Close)",
        # All except winner listed as tied 6th in source — only winner gets a real placement.
        "results_finish": [
            (1, "Clark Close"),
            (None, "Jake Klein"),
            (None, "Jeremy Klein"),
            (None, "Dan Klein"),
            (None, "Jon Hicks"),
            (None, "Jason Lackey"),
        ],
        "notes": "Bracket. Only the winner's placement was recorded; remaining players eliminated in early rounds.",
    },
    {
        "date": "2004-07-17",
        "title": "Bracket (winner: Jason Lackey)",
        "results_finish": [
            (1, "Jason Lackey"),
            (None, "Jake Klein"),
            (None, "Jeremy Klein"),
            (None, "Dan Klein"),
            (None, "Jon Hicks"),
            (None, "Clark Close"),
        ],
        "notes": "Bracket. Only the winner's placement was recorded; remaining players eliminated in early rounds.",
    },
]


def load_json(p: pathlib.Path):
    return json.loads(p.read_text(encoding="utf-8"))


def save_json(p: pathlib.Path, data) -> None:
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    players = load_json(DATA / "players.json")
    events = load_json(DATA / "events.json")
    game_types = load_json(DATA / "gameTypes.json")

    # 1) Add table-tennis game type if missing
    if not any(g["id"] == "table-tennis" for g in game_types):
        game_types.append({
            "id": "table-tennis",
            "name": "Table Tennis",
            "rules": "Ping-pong tournament. Round-robin, single-elimination, or hybrid.",
            "scoring": "By tournament finish. W-L and point differential recorded where available.",
        })
        print("Added gameType: table-tennis")

    # 2) Add new players
    existing_ids = {p["id"] for p in players}
    next_idx = max(int(pid[1:]) for pid in existing_ids) + 1
    name_to_id = {p["name"].lower(): p["id"] for p in players}
    for name, year, nickname in NEW_PLAYERS:
        if name.lower() in name_to_id:
            continue
        pid = f"p{next_idx:02d}"
        next_idx += 1
        players.append({
            "id": pid,
            "name": name,
            "nickname": nickname,
            "bio": "",
            "specialty": "",
            "joinedYear": year,
            "avatar": "",
            "active": False,
        })
        name_to_id[name.lower()] = pid
        print(f"Added player: {pid} {name}")

    # Refresh alias map
    alias = dict(ALIAS)
    for name, _, nickname in NEW_PLAYERS:
        pid = name_to_id[name.lower()]
        alias[name.lower()] = pid
        if nickname:
            alias[nickname.lower()] = pid
    # Short-name aliases for new ones
    alias["tila"] = name_to_id["tila reynolds"]
    alias["geoff"] = name_to_id["geoff brown"]
    alias["bryce"] = name_to_id["bryce"]

    def resolve(name: str) -> str:
        key = name.strip().lower()
        if key in alias:
            return alias[key]
        raise KeyError(f"Unknown player name: {name!r}")

    pname = {p["id"]: p["name"] for p in players}

    # 3) Build events
    existing_event_ids = {e["id"] for e in events}
    for t in TOURNAMENTS:
        ev_id = f"e{t['date']}"
        if ev_id in existing_event_ids:
            print(f"Skipping existing event {ev_id}")
            continue
        results = []
        if "results" in t:
            for pos, src, wins, losses in t["results"]:
                pid = resolve(src)
                results.append({
                    "playerId": pid,
                    "playerName": pname[pid],
                    "sourceName": src,
                    "position": pos,
                    "gamesWon": wins,
                    "gamesLost": losses,
                })
        elif "results_ext" in t:
            for pos, src, wins, losses, diff, points in t["results_ext"]:
                pid = resolve(src)
                row = {
                    "playerId": pid,
                    "playerName": pname[pid],
                    "sourceName": src,
                    "position": pos,
                    "gamesWon": wins,
                    "gamesLost": losses,
                    "pointDiff": diff,
                    "points": points,
                }
                results.append(row)
        elif "results_finish" in t:
            for pos, src in t["results_finish"]:
                pid = resolve(src)
                row = {
                    "playerId": pid,
                    "playerName": pname[pid],
                    "sourceName": src,
                }
                if pos is not None:
                    row["position"] = pos
                results.append(row)

        winner = next((r for r in results if r.get("position") == 1), None)
        winner_id = winner["playerId"] if winner else ""
        winner_name = winner["playerName"] if winner else ""
        events.append({
            "id": ev_id,
            "title": f"Table Tennis Tournament - {t['date']}",
            "date": t["date"],
            "location": "",
            "host": "",
            "photo": "",
            "recap": f"Table Tennis: {winner_name} won.".strip(),
            "highlights": [f"{winner_name} won the table tennis tournament."] if winner_name else [],
            "games": [{
                "gameId": "table-tennis",
                "notes": t["notes"],
                "results": results,
                "rounds": [],
                "winnerId": winner_id,
            }],
        })
        print(f"Added event: {ev_id} ({len(results)} players)")

    # Sort events by date
    events.sort(key=lambda e: e["date"])

    # Save
    for base in (DATA, PUBLIC):
        save_json(base / "players.json", players)
        save_json(base / "events.json", events)
        save_json(base / "gameTypes.json", game_types)

    print("Wrote players.json, events.json, gameTypes.json (data + public/data)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
