"""Apply brother's spreadsheet corrections to the table-tennis data.

- Rename player Bryce Wi -> Bryce Jolley
- Rename player Mick Tatcher -> Mick Tacher
- Add new player: Sam Linford (joined 2004)
- Move 2007-03-10 -> 2007-03-20; add W/L data to that event.
- Fix Dave Coleman on 2007-04-07: 8-8 (was 8-9); place tied 5th with Jake.
- Replace 2004-07-17 results: Jason 1, Dave 2, Mitch 3, Jon 4, Dan 5, Jake 6.
- Replace 2004-07-24 results: Clark 1, Mitch 2, Jon 3, Jeremy 4, Jake 5, Jason 6, Dan 7, Sam 8.
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load(p): return json.loads(p.read_text(encoding="utf-8"))
def save(p, d): p.write_text(json.dumps(d, indent=2) + "\n", encoding="utf-8")


def patch_players(path: pathlib.Path) -> dict:
    players = load(path)
    by_name = {p["name"]: p for p in players}
    if "Bryce Wi" in by_name:
        by_name["Bryce Wi"]["name"] = "Bryce Jolley"
        print(f"  {path.name}: renamed Bryce Wi -> Bryce Jolley")
    if "Mick Tatcher" in by_name:
        by_name["Mick Tatcher"]["name"] = "Mick Tacher"
        print(f"  {path.name}: renamed Mick Tatcher -> Mick Tacher")
    # Add Sam Linford if missing
    name_set = {p["name"] for p in players}
    if "Sam Linford" not in name_set:
        existing_ids = {int(p["id"][1:]) for p in players if p["id"].startswith("p")}
        next_id = f"p{max(existing_ids) + 1:02d}"
        players.append({
            "id": next_id,
            "name": "Sam Linford",
            "nickname": "Sam",
            "bio": "",
            "specialty": "",
            "joinedYear": 2004,
            "avatar": "",
            "active": False,
        })
        print(f"  {path.name}: added {next_id} Sam Linford")
    save(path, players)
    return {p["name"]: p["id"] for p in players}


def patch_events(path: pathlib.Path, name_to_id: dict) -> None:
    events = load(path)

    def find(eid):
        return next((e for e in events if e["id"] == eid), None)

    # --- Rename Bryce Wi -> Bryce Jolley in any embedded playerName field ---
    for ev in events:
        for g in ev.get("games", []):
            for r in g.get("results", []):
                if r.get("playerName") == "Bryce Wi":
                    r["playerName"] = "Bryce Jolley"
                if r.get("playerName") == "Mick Tatcher":
                    r["playerName"] = "Mick Tacher"

    # --- 2007-03-10 -> 2007-03-20 with W/L ---
    ev = find("e2007-03-10")
    if ev:
        ev["id"] = "e2007-03-20"
        ev["date"] = "2007-03-20"
        ev["title"] = "Table Tennis Tournament - 2007-03-20"
        game = ev["games"][0]
        # Brother's W/L: Jon 9-4, Tila 9-6, Jer 6-5, Jake 8-4, Bryce 4-5, Geoff 0-9
        wl = {
            "p05": (9, 4),   # Jon Hicks
            "p13": (9, 6),   # Tila Reynolds
            "p02": (6, 5),   # Jeremy Klein
            "p01": (8, 4),   # Jake Klein
            "p18": (4, 5),   # Bryce Jolley (formerly Bryce Wi)
            "p14": (0, 9),   # Geoff Brown
        }
        for r in game["results"]:
            if r["playerId"] in wl:
                r["gamesWon"], r["gamesLost"] = wl[r["playerId"]]
        game["notes"] = "Single-elimination bracket. W/L records from full event."
        print(f"  {path.name}: moved 2007-03-10 -> 2007-03-20 + W/L data")

    # --- 2007-04-07 Dave Coleman fix ---
    ev = find("e2007-04-07")
    if ev:
        game = ev["games"][0]
        for r in game["results"]:
            if r["playerId"] == "p16":  # Dave Coleman
                r["gamesWon"] = 8
                r["gamesLost"] = 8
                r["position"] = 5  # tied 5th with Jake
                # Drop pointDiff/points since the source we trust now disagrees
                r.pop("pointDiff", None)
                r.pop("points", None)
                print(f"  {path.name}: fixed Dave Coleman 2007-04-07 -> 8-8, place 5")
        # Re-sort results by position then name
        game["results"].sort(key=lambda r: (r.get("position", 99), r.get("playerName", "")))

    # --- 2004-07-17 full results ---
    ev = find("e2004-07-17")
    if ev:
        order = [
            (1, "p19", "Jason Lackey"),
            (2, "p16", "Dave Coleman"),
            (3, "p04", "Mitch Stuard"),
            (4, "p05", "Jon Hicks"),
            (5, "p17", "Dan Klein"),
            (6, "p01", "Jake Klein"),
        ]
        game = ev["games"][0]
        game["results"] = [
            {"playerId": pid, "playerName": name, "sourceName": name, "position": pos}
            for pos, pid, name in order
        ]
        game["winnerId"] = "p19"
        game["notes"] = "Bracket. Full placements recorded."
        ev["recap"] = "Table Tennis: Jason Lackey won."
        ev["highlights"] = ["Jason Lackey won the table tennis tournament."]
        print(f"  {path.name}: replaced 2004-07-17 results (6 players)")

    # --- 2004-07-24 full results ---
    ev = find("e2004-07-24")
    if ev:
        sam_id = name_to_id["Sam Linford"]
        order = [
            (1, "p03", "Clark Close"),
            (2, "p04", "Mitch Stuard"),
            (3, "p05", "Jon Hicks"),
            (4, "p02", "Jeremy Klein"),
            (5, "p01", "Jake Klein"),
            (6, "p19", "Jason Lackey"),
            (7, "p17", "Dan Klein"),
            (8, sam_id, "Sam Linford"),
        ]
        game = ev["games"][0]
        game["results"] = [
            {"playerId": pid, "playerName": name, "sourceName": name, "position": pos}
            for pos, pid, name in order
        ]
        game["winnerId"] = "p03"
        game["notes"] = "Bracket. Full placements recorded."
        ev["recap"] = "Table Tennis: Clark Close won."
        ev["highlights"] = ["Clark Close won the table tennis tournament."]
        print(f"  {path.name}: replaced 2004-07-24 results (8 players)")

    # Sort events by date
    events.sort(key=lambda e: e["date"])
    save(path, events)


def main():
    for base in (ROOT / "data", ROOT / "public" / "data"):
        name_to_id = patch_players(base / "players.json")
        patch_events(base / "events.json", name_to_id)


if __name__ == "__main__":
    main()
