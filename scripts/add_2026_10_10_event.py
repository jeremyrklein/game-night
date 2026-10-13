from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = "e2026-10-10"

PLAYERS = {
    "Clark": ("p03", "Clark Close"),
    "Jeremy": ("p02", "Jeremy Klein"),
    "Jon": ("p05", "Jon Hicks"),
    "Jake": ("p01", "Jake Klein"),
    "John": ("p06", "John Sargent"),
    "Mitch": ("p04", "Mitch Stuard"),
}

POKER_NOTES = (
    "Mitch was knocked out first when Clark went all in; Jeremy folded. "
    "Jeremy then went all in, and Jake and John called. Jake won on the river with the same hand as Jeremy, "
    "but his two-pair high card was one rank higher; Jeremy's hand beat John's. "
    "Hicks went all in and was knocked out by Jake. Jake went all in on the second-to-last hand, "
    "and Clark folded, losing only the small blind. Jake went all in again on the last hand. "
    "Clark called and lost; he would have won by folding, but wanted to keep things interesting to the end."
)


def result(player: str, **values: int) -> dict[str, object]:
    player_id, player_name = PLAYERS[player]
    return {
        "playerId": player_id,
        "playerName": player_name,
        "sourceName": player,
        **values,
    }


def round_result(step: int, label: str, scores: list[int]) -> dict[str, object]:
    player_order = ["Clark", "Jeremy", "Jon", "Jake", "John", "Mitch"]
    return {
        "step": str(step),
        "label": label,
        "values": [
            {**result(player), "value": score}
            for player, score in zip(player_order, scores, strict=True)
        ],
    }


EVENT = {
    "id": EVENT_ID,
    "title": "Game Night - Oct 10, 2026",
    "date": "2026-10-10",
    "location": "Jake's house in Renton Highlands",
    "host": "p01",
    "photo": "",
    "recap": (
        "Sequence: Jeremy Klein won with 6 games and 3 series. "
        "Hearts: Jeremy Klein won with 57 points. Poker: Jake Klein won."
    ),
    "highlights": [
        "Jeremy Klein won Sequence with 6 games and 3 series.",
        "Jeremy Klein won Hearts with 57 points.",
        "Jake Klein won Poker.",
    ],
    "games": [
        {
            "gameId": "sequence",
            "notes": "",
            "results": [
                result("Jeremy", gamesWon=6, seriesWon=3, position=1),
                result("Mitch", gamesWon=4, seriesWon=1, position=2),
                result("Jake", gamesWon=3, seriesWon=1, position=4),
                result("Clark", gamesWon=3, seriesWon=1, position=4),
            ],
            "rounds": [],
            "winnerId": "p02",
        },
        {
            "gameId": "hearts",
            "notes": "Mitch shot the moon in round 7; Jake shot the moon in round 9.",
            "results": [
                result("Clark", points=94, position=5),
                result("Jeremy", points=57, position=1),
                result("Jon", points=76, position=3),
                result("Jake", points=64, position=2, moonShots=1),
                result("John", points=115, position=6),
                result("Mitch", points=88, position=4, moonShots=1),
            ],
            "rounds": [
                round_result(1, "1 Left", [14, 0, 0, 0, 0, 12]),
                round_result(2, "2 Left", [33, 0, 0, 0, 0, 19]),
                round_result(3, "1 Right", [33, 1, 10, 0, 15, 19]),
                round_result(4, "2 Right", [33, 4, 0, 0, 19, 38]),
                round_result(5, "Across", [33, 5, 24, 5, 25, 38]),
                round_result(6, "Hold", [38, 5, 24, 8, 25, 56]),
                round_result(7, "1 Left", [64, 31, 50, 34, 51, 56]),
                round_result(8, "2 Left", [68, 31, 50, 56, 51, 56]),
                round_result(9, "1 Right", [94, 57, 76, 56, 77, 82]),
                round_result(10, "2 Right", [94, 57, 76, 56, 97, 88]),
                round_result(11, "Across", [94, 57, 76, 64, 115, 88]),
            ],
            "winnerId": "p02",
        },
        {
            "gameId": "poker",
            "notes": POKER_NOTES,
            "results": [
                result("Jake", position=1),
                result("Clark", position=2),
                result("Jon", position=3),
                result("Jeremy", position=4),
                result("John", position=5),
                result("Mitch", position=6),
            ],
            "rounds": [],
            "winnerId": "p01",
        },
    ],
}

GAMES = [
    {
        "id": f"{EVENT_ID}-sequence-1",
        "eventId": EVENT_ID,
        "gameType": "sequence",
        "players": ["p02", "p04", "p01", "p03"],
        "winner": "p02",
        "scores": {"p02": 6, "p04": 4, "p01": 3, "p03": 3},
        "notes": "",
    },
    {
        "id": f"{EVENT_ID}-hearts-2",
        "eventId": EVENT_ID,
        "gameType": "hearts",
        "players": ["p03", "p02", "p05", "p01", "p06", "p04"],
        "winner": "p02",
        "scores": {"p03": 94, "p02": 57, "p05": 76, "p01": 64, "p06": 115, "p04": 88},
        "notes": "Mitch shot the moon in round 7; Jake shot the moon in round 9.",
    },
    {
        "id": f"{EVENT_ID}-poker-3",
        "eventId": EVENT_ID,
        "gameType": "poker",
        "players": ["p01", "p03", "p05", "p02", "p06", "p04"],
        "winner": "p01",
        "scores": {},
        "notes": POKER_NOTES,
    },
]


def upsert(path: Path, records: list[dict], record_id: str) -> None:
    existing = json.loads(path.read_text(encoding="utf-8"))
    updated = [record for record in existing if record.get("id") != record_id]
    updated.extend(records)
    path.write_text(json.dumps(updated, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    for data_directory in (ROOT / "data", ROOT / "public" / "data"):
        upsert(data_directory / "events.json", [EVENT], EVENT_ID)
        existing_games = json.loads((data_directory / "games.json").read_text(encoding="utf-8"))
        existing_games = [game for game in existing_games if game.get("eventId") != EVENT_ID]
        (data_directory / "games.json").write_text(
            json.dumps([*existing_games, *GAMES], indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Added {EVENT_ID} with {len(EVENT['games'])} games.")


if __name__ == "__main__":
    main()