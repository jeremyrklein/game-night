from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = Path(r"c:/Users/jerem/OneDrive/game night totals.csv")
VALID_DATE = re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$")
GAME_MAP = {
    "blackjack": "blackjack",
    "poker": "poker",
    "hearts": "hearts",
    "sequence": "sequence",
    "canadian salad": "canadian-salad",
    "oh heck": "oh-heck",
}
GAME_NAMES = {
    "blackjack": "Blackjack",
    "poker": "Poker",
    "hearts": "Hearts",
    "sequence": "Sequence",
    "canadian-salad": "Canadian Salad",
    "oh-heck": "Oh Heck",
    "table-tennis": "Table Tennis",
}
BASE_PLAYERS = [
    {
        "id": "p01",
        "name": "Jake Klein",
        "nickname": "Jake",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p02",
        "name": "Jeremy Klein",
        "nickname": "Jeremy",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p03",
        "name": "Clark Close",
        "nickname": "Clark",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p04",
        "name": "Mitch Stuard",
        "nickname": "Mitch",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p05",
        "name": "Jon Hicks",
        "nickname": "Jon",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p06",
        "name": "John Sargent",
        "nickname": "John",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p07",
        "name": "Aaron Grefsrud",
        "nickname": "Aaron",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p08",
        "name": "Jessica Grefsrud",
        "nickname": "Jessica",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p09",
        "name": "Ben Feely",
        "nickname": "Ben",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
    {
        "id": "p10",
        "name": "Brandon Ford",
        "nickname": "Brandon",
        "bio": "Core game-night player.",
        "specialty": "TBD",
        "joinedYear": 2026,
        "avatar": "",
        "active": True,
    },
]


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def key(value: object) -> str:
    return clean(value).lower()


def parse_value(value: str) -> object:
    cleaned = clean(value)
    if not cleaned:
        return ""
    if re.fullmatch(r"-?\d+", cleaned):
        return int(cleaned)
    if re.fullmatch(r"-?\d+\.\d+", cleaned):
        return float(cleaned)
    return cleaned


def is_date(value: str) -> bool:
    return bool(VALID_DATE.match(value))


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%m/%d/%Y")


def event_id(date_text: str) -> str:
    parsed = parse_date(date_text)
    return f"e{parsed:%Y-%m-%d}"


def title_for_date(date_text: str) -> str:
    parsed = parse_date(date_text)
    return f"Game Night - {parsed.strftime('%b')} {parsed.day}, {parsed.year}"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=True)
        file.write("\n")


def build_player_lookup(players: list[dict]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for player in players:
        name_parts = clean(player.get("name", "")).split()
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[-1] if name_parts else ""
        for candidate in (
            player.get("id", ""),
            player.get("nickname", ""),
            player.get("name", ""),
            first_name,
            last_name,
        ):
            normalized = key(candidate)
            if normalized and normalized not in lookup:
                lookup[normalized] = player["id"]
    return lookup


def resolve_player_id(player_name: str, lookup: dict[str, str]) -> str | None:
    return lookup.get(key(player_name))


def next_player_id(players: list[dict]) -> str:
    numbers: list[int] = []
    for player in players:
        match = re.fullmatch(r"p(\d+)", key(player.get("id", "")))
        if match:
            numbers.append(int(match.group(1)))
    return f"p{(max(numbers) + 1) if numbers else 1:02d}"


def canonical_game(raw_game: str) -> str | None:
    return GAME_MAP.get(key(raw_game))


def winner_from_results(results: list[dict], game_id: str | None = None) -> dict[str, object]:
    ranked = [result for result in results if result.get("position") is not None]
    if ranked:
        # Trust placement only when it is clearly meaningful.
        # Some historical rows only contain a single placement that is not the winner.
        positions = [int(result["position"]) for result in ranked]
        if len(ranked) >= 2 or any(position == 1 for position in positions):
            return sorted(ranked, key=lambda result: int(result["position"]))[0]

    ranked = [result for result in results if result.get("seriesWon") is not None]
    if ranked:
        return sorted(
            ranked,
            key=lambda result: (-int(result.get("seriesWon", 0)), -int(result.get("gamesWon", 0))),
        )[0]

    ranked = [result for result in results if result.get("gamesWon") is not None]
    if ranked:
        return sorted(ranked, key=lambda result: -int(result.get("gamesWon", 0)))[0]

    ranked = [result for result in results if result.get("points") is not None]
    if len(ranked) >= 2:
        if game_id in {"hearts", "canadian-salad"}:
            return sorted(ranked, key=lambda result: int(result.get("points", 0)))[0]
        return sorted(ranked, key=lambda result: -int(result.get("points", 0)))[0]

    ranked = [result for result in results if result.get("winnings") is not None]
    if len(ranked) >= 2:
        return sorted(ranked, key=lambda result: -int(result.get("winnings", 0)))[0]

    return results[0] if results else {}


def build_game_summary(game_id: str, results: list[dict]) -> str:
    if not results:
        return f"{GAME_NAMES.get(game_id, game_id)}: no scored results were recorded."

    winner = winner_from_results(results, game_id)
    winner_name = str(winner.get("playerName", winner.get("playerId", "")))

    if game_id == "sequence":
        pieces = []
        if winner.get("gamesWon") is not None:
            pieces.append(f"{winner['gamesWon']} games")
        if winner.get("seriesWon") is not None:
            pieces.append(f"{winner['seriesWon']} series")
        if pieces:
            return f"{winner_name} won Sequence with {' and '.join(pieces)}."
        return f"{winner_name} won Sequence."

    if game_id in {"hearts", "canadian-salad"}:
        points = winner.get("points")
        if points is not None:
            return f"{winner_name} won {GAME_NAMES[game_id]} with {points} points."
        return f"{winner_name} won {GAME_NAMES[game_id]}."

    return f"{winner_name} won {GAME_NAMES.get(game_id, game_id)}."


def build_games_from_events(events: list[dict]) -> list[dict]:
    games: list[dict] = []
    for event in events:
        for index, event_game in enumerate(event.get("games", []), start=1):
            results = event_game.get("results", [])
            if not results:
                continue

            players: list[str] = []
            scores: dict[str, float | int] = {}
            for result in results:
                player_id = str(result.get("playerId", "")).strip()
                if player_id and player_id not in players:
                    players.append(player_id)
                if result.get("points") is not None:
                    scores[player_id] = result["points"]
                elif result.get("winnings") is not None:
                    scores[player_id] = result["winnings"]
                elif result.get("gamesWon") is not None:
                    scores[player_id] = result["gamesWon"]
                elif result.get("seriesWon") is not None:
                    scores[player_id] = result["seriesWon"]
                # else: leave the player out of scores — they participated but no score was recorded.

            winner_id = str(event_game.get("winnerId", "")).strip()
            winner = winner_from_results(results, event_game["gameId"])
            games.append(
                {
                    "id": f"{event['id']}-{event_game['gameId']}-{index}",
                    "eventId": event["id"],
                    "gameType": event_game["gameId"],
                    "players": players,
                    "winner": winner_id or str(winner.get("playerId", "")),
                    "scores": scores,
                    "notes": event_game.get("notes", ""),
                }
            )

    return games


def build_achievements(
    players: list[dict],
    events: list[dict],
    games: list[dict],
    advanced_stats: dict[str, dict],
    moon_shots: dict[str, int],
    places_by_player: dict[str, dict[str, list[int]]],
) -> list[dict]:
    achievements: list[dict] = []

    def add_achievement(name: str, holders: list[str], date_awarded: str, reason: str) -> None:
        normalized_holders = sorted({holder for holder in holders if holder})
        if not normalized_holders or not date_awarded:
            return
        achievements.append(
            {
                "id": f"a{len(achievements) + 1:03d}",
                "name": name,
                "holder": normalized_holders[0],
                "holders": normalized_holders,
                "dateAwarded": date_awarded,
                "reason": reason,
            }
        )

    latest_event_date = max((str(event.get("date", "")) for event in events), default="")
    event_dates_by_id = {str(event.get("id", "")): str(event.get("date", "")) for event in events}

    losses_by_player: dict[str, int] = defaultdict(int)
    last_place_by_player: dict[str, int] = defaultdict(int)
    wins_by_type: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    games_by_type: dict[str, list[dict]] = defaultdict(list)

    ordered_games = sorted(games, key=lambda game: (event_dates_by_id.get(str(game.get("eventId", "")), ""), str(game.get("id", ""))))

    for game in ordered_games:
        winner = str(game.get("winner", ""))
        game_type = str(game.get("gameType", ""))
        if winner and game_type:
            wins_by_type[game_type][winner] += 1
            games_by_type[game_type].append(game)

        for player_id in map(str, game.get("players", [])):
            if player_id and player_id != winner:
                losses_by_player[player_id] += 1

    # Last-place finishes: derived from event-level results (which include positions).
    for event in events:
        for event_game in event.get("games", []):
            results = [r for r in event_game.get("results", []) if isinstance(r.get("position"), int) and r.get("playerId")]
            if len(results) < 2:
                continue
            max_pos = max(r["position"] for r in results)
            for r in results:
                if r["position"] == max_pos:
                    last_place_by_player[str(r["playerId"])] += 1

    if last_place_by_player:
        max_last = max(last_place_by_player.values())
        holders = sorted(player_id for player_id, total in last_place_by_player.items() if total == max_last)
        add_achievement(
            "Most last-place finishes",
            holders,
            latest_event_date,
            f"{'Tied at' if len(holders) > 1 else 'Most last-place finishes with'} {max_last} last-place finishes across all tracked games.",
        )

    if moon_shots:
        max_moon_shots = max(moon_shots.values())
        holders = sorted(player_id for player_id, total in moon_shots.items() if total == max_moon_shots and total > 0)
        if holders:
            add_achievement(
                "Most moon shots",
                holders,
                latest_event_date,
                f"{'Tied at' if len(holders) > 1 else 'Most Hearts moon shots with'} {max_moon_shots} Hearts moon shots.",
            )

    qualified_average_finish: dict[str, float] = {}
    for player_id in advanced_stats.keys():
        all_places = [place for values in places_by_player[player_id].values() for place in values]
        if all_places:
            qualified_average_finish[player_id] = sum(all_places) / len(all_places)

    if qualified_average_finish:
        best_average = min(qualified_average_finish.values())
        holders = sorted(
            player_id
            for player_id, average in qualified_average_finish.items()
            if abs(average - best_average) < 1e-9
        )
        add_achievement(
            "Best average finish",
            holders,
            latest_event_date,
            f"{'Tied for best average finish at' if len(holders) > 1 else 'Best average finish at'} {best_average:.2f} across qualified players (minimum 5 events).",
        )

        worst_average = max(qualified_average_finish.values())
        if abs(worst_average - best_average) > 1e-9:
            holders = sorted(
                player_id
                for player_id, average in qualified_average_finish.items()
                if abs(average - worst_average) < 1e-9
            )
            add_achievement(
                "Worst average finish",
                holders,
                latest_event_date,
                f"{'Tied for worst average finish at' if len(holders) > 1 else 'Worst average finish at'} {worst_average:.2f} across qualified players (minimum 5 events).",
            )

    # Per-game-type best/worst average finish (min 3 games of that type, qualified players only).
    per_game_averages: dict[str, dict[str, float]] = defaultdict(dict)
    for player_id in advanced_stats.keys():
        for game_id, places in places_by_player[player_id].items():
            if len(places) >= 3:
                per_game_averages[game_id][player_id] = sum(places) / len(places)

    for game_id in sorted(per_game_averages.keys()):
        averages = per_game_averages[game_id]
        if len(averages) < 2:
            continue
        game_name = GAME_NAMES.get(game_id, game_id)
        best = min(averages.values())
        best_holders = sorted(pid for pid, avg in averages.items() if abs(avg - best) < 1e-9)
        add_achievement(
            f"Best average {game_name} finish",
            best_holders,
            latest_event_date,
            f"{'Tied for best average' if len(best_holders) > 1 else 'Best average'} {game_name} finish at {best:.2f} (minimum 3 {game_name} games).",
        )
        worst = max(averages.values())
        if abs(worst - best) < 1e-9:
            continue
        worst_holders = sorted(pid for pid, avg in averages.items() if abs(avg - worst) < 1e-9)
        add_achievement(
            f"Worst average {game_name} finish",
            worst_holders,
            latest_event_date,
            f"{'Tied for worst average' if len(worst_holders) > 1 else 'Worst average'} {game_name} finish at {worst:.2f} (minimum 3 {game_name} games).",
        )

    for game_type, wins in sorted(wins_by_type.items()):
        if game_type == "sequence" or not wins:
            continue

        max_wins = max(wins.values())
        holders = sorted(player_id for player_id, total in wins.items() if total == max_wins)
        if max_wins <= 1 and len(holders) > 1:
            continue
        game_name = GAME_NAMES.get(game_type, game_type)
        add_achievement(
            f"Most {game_name} wins",
            holders,
            latest_event_date,
            f"{'Tied atop the' if len(holders) > 1 else 'Leads the'} {game_name} win column with {max_wins} wins.",
        )

    streaks_by_type: dict[str, dict[str, tuple[int, str]]] = defaultdict(dict)
    for game_type, game_list in games_by_type.items():
        current_winner = ""
        current_streak = 0
        for game in game_list:
            winner = str(game.get("winner", ""))
            if not winner:
                current_winner = ""
                current_streak = 0
                continue
            if winner == current_winner:
                current_streak += 1
            else:
                current_winner = winner
                current_streak = 1
            end_date = event_dates_by_id.get(str(game.get("eventId", "")), latest_event_date)
            previous = streaks_by_type[game_type].get(winner)
            if previous is None or current_streak > previous[0] or (current_streak == previous[0] and end_date > previous[1]):
                streaks_by_type[game_type][winner] = (current_streak, end_date)

    for game_type, streak_map in sorted(streaks_by_type.items()):
        if not streak_map:
            continue
        best_streak = max(length for length, _ in streak_map.values())
        if best_streak < 2:
            continue
        holders = sorted(player_id for player_id, (length, _) in streak_map.items() if length == best_streak)
        game_name = "Sequence event" if game_type == "sequence" else GAME_NAMES.get(game_type, game_type)
        add_achievement(
            f"Longest {game_name} streak",
            holders,
            max(streak_map[player_id][1] for player_id in holders),
            f"{'Tied for the longest' if len(holders) > 1 else 'Longest'} {game_name} streak at {best_streak} straight sessions.",
        )

    sequence_games: dict[str, int] = defaultdict(int)
    sequence_series: dict[str, int] = defaultdict(int)
    sequence_events: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))
    latest_sequence_date = latest_event_date
    for event in events:
        event_date = str(event.get("date", ""))
        for event_game in event.get("games", []):
            if str(event_game.get("gameId", "")) != "sequence":
                continue
            latest_sequence_date = max(latest_sequence_date, event_date)
            best_series = -1
            best_games = -1
            best_player = ""
            for result in event_game.get("results", []):
                player_id = str(result.get("playerId", ""))
                games_won = int(result.get("gamesWon", 0) or 0)
                series_won = int(result.get("seriesWon", 0) or 0)
                if player_id:
                    sequence_games[player_id] += games_won
                    sequence_series[player_id] += series_won
                    current_events, current_games = sequence_events[player_id]
                    sequence_events[player_id] = (current_events, current_games)
                if series_won > best_series or (series_won == best_series and games_won > best_games):
                    best_series = series_won
                    best_games = games_won
                    best_player = player_id
            if best_player:
                current_events, current_games = sequence_events[best_player]
                sequence_events[best_player] = (current_events + 1, current_games + best_games)

    if sequence_games:
        max_games = max(sequence_games.values())
        holders = sorted(player_id for player_id, total in sequence_games.items() if total == max_games)
        add_achievement(
            "Most Sequence games",
            holders,
            latest_sequence_date,
            f"{'Tied for most Sequence games with' if len(holders) > 1 else 'Most Sequence games with'} {max_games} game wins.",
        )

    if sequence_series:
        max_series = max(sequence_series.values())
        holders = sorted(player_id for player_id, total in sequence_series.items() if total == max_series)
        add_achievement(
            "Most Sequence series",
            holders,
            latest_sequence_date,
            f"{'Tied for most Sequence series with' if len(holders) > 1 else 'Most Sequence series with'} {max_series} series wins.",
        )

    if sequence_events:
        sorted_events = sorted(sequence_events.items(), key=lambda item: (-item[1][0], -item[1][1], item[0]))
        best_events, best_games = sorted_events[0][1]
        holders = sorted(player_id for player_id, totals in sequence_events.items() if totals == (best_events, best_games))
        add_achievement(
            "Most Sequence events",
            holders,
            latest_sequence_date,
            f"{'Tied for most Sequence events with' if len(holders) > 1 else 'Most Sequence events with'} {best_events} event wins and {best_games} games as the tiebreaker.",
        )

    return achievements


def count_moon_shots(rows: list[list[str]], player_lookup: dict[str, str]) -> dict[str, int]:
    grouped: dict[str, dict[str, list[list[str]]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        if len(row) < 9:
            continue
        date_text = clean(row[1])
        game_id = canonical_game(row[0])
        if not is_date(date_text) or not game_id:
            continue
        grouped[date_text][game_id].append(row)

    moon_counts: dict[str, int] = defaultdict(int)
    for date_text, games in grouped.items():
        hearts_rows = games.get("hearts")
        if not hearts_rows:
            continue

        player_row = next((row for row in hearts_rows if clean(row[7]) in {"Player", "Round"}), None)
        if not player_row:
            continue

        source_names = [clean(value) for value in player_row[8:] if clean(value)]
        for row in hearts_rows:
            moon_text = clean(row[5]).lower()
            if "shoots moon" not in moon_text:
                continue

            for source_name in source_names:
                if re.search(rf"\b{re.escape(source_name.lower())}\b", moon_text):
                    player_id = resolve_player_id(source_name, player_lookup)
                    if player_id:
                        moon_counts[player_id] += 1

    return moon_counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Import the totals CSV into the app datasets.")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Path to the totals CSV export.")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    players_paths = [ROOT / "public" / "data" / "players.json", ROOT / "data" / "players.json"]
    events_paths = [ROOT / "public" / "data" / "events.json", ROOT / "data" / "events.json"]
    games_paths = [ROOT / "public" / "data" / "games.json", ROOT / "data" / "games.json"]
    achievements_paths = [ROOT / "public" / "data" / "achievements.json", ROOT / "data" / "achievements.json"]
    stats_paths = [ROOT / "public" / "data" / "advanced_stats.json", ROOT / "data" / "advanced_stats.json"]

    players = [dict(player) for player in BASE_PLAYERS]

    # Preserve user-edited fields (avatar, specialty, bio, nickname, joinedYear) from existing players.json.
    existing_players_path = ROOT / "data" / "players.json"
    if existing_players_path.exists():
        try:
            existing_players = json.loads(existing_players_path.read_text(encoding="utf-8"))
            existing_by_id = {p.get("id"): p for p in existing_players if p.get("id")}
            for player in players:
                prev = existing_by_id.get(player.get("id"))
                if not prev:
                    continue
                for field in ("avatar", "specialty", "bio", "nickname"):
                    if prev.get(field):
                        player[field] = prev[field]
        except (OSError, json.JSONDecodeError):
            pass

    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file))

    discovered_names: list[str] = []
    first_seen_year: dict[str, int] = {}
    valid_rows: list[list[str]] = []

    KNOWN_KINDS = {"Player", "Round", "Place", "Games", "Series", "Total", "Target hit"}
    NON_PLAYER_LABELS = {"target", "score", "target hit", "place", "total", "games", "series", "round", "player"}

    def normalize_player_header(row: list[str]) -> None:
        """Some newer CSV rows omit the literal 'Player' label in col 7. If col 7 is
        empty and col 8+ contains non-numeric names (and no label keywords),
        treat it as a Player header."""
        if clean(row[7]):
            return
        non_empty = [clean(v) for v in row[8:] if clean(v)]
        if not non_empty:
            return
        if any(re.fullmatch(r"-?\d+(?:\.\d+)?", v) for v in non_empty):
            return
        if any(v.lower() in NON_PLAYER_LABELS for v in non_empty):
            return
        row[7] = "Player"

    for row in rows[1:]:
        if len(row) < 9:
            continue

        date_text = clean(row[1])
        game_id = canonical_game(row[0])
        if not is_date(date_text) or not game_id:
            continue

        normalize_player_header(row)
        valid_rows.append(row)

        kind = clean(row[7])
        if kind in {"Player", "Round"}:
            year = parse_date(date_text).year
            for raw_name in row[8:]:
                player_name = clean(raw_name)
                if not player_name or re.fullmatch(r"\d+", player_name):
                    continue
                if player_name not in discovered_names:
                    discovered_names.append(player_name)
                first_seen_year.setdefault(player_name, year)

    existing_names = set()
    for player in players:
        name_parts = clean(player.get("name", "")).split()
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[-1] if name_parts else ""
        for candidate in (
            player.get("id", ""),
            player.get("nickname", ""),
            player.get("name", ""),
            first_name,
            last_name,
        ):
            normalized = key(candidate)
            if normalized:
                existing_names.add(normalized)
    next_id = next_player_id(players)
    next_number = int(next_id[1:])
    for player_name in discovered_names:
        if key(player_name) in existing_names:
            continue

        player_id = f"p{next_number:02d}"
        next_number += 1
        nickname = player_name.split()[0] if player_name.split() else player_name
        players.append(
            {
                "id": player_id,
                "name": player_name,
                "nickname": nickname,
                "bio": "Core game-night player.",
                "specialty": "TBD",
                "joinedYear": first_seen_year.get(player_name, parse_date("1/1/2021").year),
                "avatar": "",
                "active": True,
            }
        )
        existing_names.add(key(player_name))

    # Backfill joinedYear from first CSV appearance for existing BASE_PLAYERS too.
    for player in players:
        name_candidates = [player.get("name", ""), player.get("nickname", "")]
        for cand in name_candidates:
            if cand and cand in first_seen_year:
                player["joinedYear"] = first_seen_year[cand]
                break

    player_lookup = build_player_lookup(players)

    events_by_date: dict[str, dict] = {}
    date_order: list[str] = []
    participation_dates: dict[str, set[str]] = defaultdict(set)
    places_by_player: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    scores_by_player: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))

    for row in valid_rows:
        date_text = clean(row[1])
        date_value = parse_date(date_text).date().isoformat()
        game_id = canonical_game(row[0])
        if not game_id:
            continue

        if date_value not in events_by_date:
            events_by_date[date_value] = {
                "id": event_id(date_text),
                "title": title_for_date(date_text),
                "date": date_value,
                "location": clean(row[3]),
                "host": "",
                "photo": "",
                "recap": "",
                "highlights": [],
                "games": [],
            }
            date_order.append(date_value)
        elif not events_by_date[date_value]["location"] and clean(row[3]):
            events_by_date[date_value]["location"] = clean(row[3])

        event = events_by_date[date_value]
        game = next((item for item in event["games"] if item["gameId"] == game_id), None)

        kind = clean(row[7])
        if kind in {"Player", "Round"}:
            player_names = [clean(value) for value in row[8:] if clean(value)]
            player_ids: list[str] = []
            for player_name in player_names:
                if re.fullmatch(r"\d+", player_name):
                    continue
                player_id = resolve_player_id(player_name, player_lookup)
                if player_id:
                    player_ids.append(player_id)
                    participation_dates[player_id].add(date_value)

            if game is None:
                game = {"gameId": game_id, "notes": clean(row[4]), "results": [], "rounds": []}
                event["games"].append(game)

            if not game.get("notes") and clean(row[4]):
                game["notes"] = clean(row[4])

            if not game["results"]:
                entries: list[tuple[str, str]] = []
                for player_name in player_names:
                    if re.fullmatch(r"\d+", player_name):
                        continue
                    player_id = resolve_player_id(player_name, player_lookup)
                    if player_id:
                        entries.append((player_id, player_name))

                game["results"] = [
                    {
                        "playerId": player_id,
                        "playerName": next((player["name"] for player in players if player["id"] == player_id), player_id),
                        "sourceName": source_name,
                    }
                    for player_id, source_name in entries
                ]
            continue

        if game is None or not game.get("results"):
            continue

        player_names = [str(result.get("sourceName", result.get("playerName", ""))).strip() for result in game["results"]]
        values = [clean(value) for value in row[8 : 8 + len(player_names)]]

        if kind not in {"Place", "Games", "Series", "Total"}:
            round_values = []
            for index, value in enumerate(values):
                player_name = player_names[index]
                player_id = resolve_player_id(player_name, player_lookup)
                if not player_id:
                    continue
                round_values.append(
                    {
                        "playerId": player_id,
                        "playerName": next((player["name"] for player in players if player["id"] == player_id), player_name),
                        "sourceName": player_name,
                        "value": parse_value(value),
                    }
                )

            if round_values:
                game.setdefault("rounds", []).append(
                    {
                        "step": clean(row[6]),
                        "label": kind,
                        "values": round_values,
                    }
                )
            continue

        for index, value in enumerate(values):
            if not value:
                continue

            player_name = player_names[index]
            player_id = resolve_player_id(player_name, player_lookup)
            if not player_id:
                continue

            result = next((item for item in game["results"] if item["playerId"] == player_id), None)
            if result is None:
                result = {"playerId": player_id, "playerName": player_name, "sourceName": player_name}
                game["results"].append(result)

            if kind == "Place":
                result["position"] = int(float(value))
                places_by_player[player_id][game_id].append(result["position"])
            elif kind == "Games":
                result["gamesWon"] = int(float(value))
            elif kind == "Series":
                result["seriesWon"] = int(float(value))
            elif kind == "Total":
                result["points"] = int(float(value))

    events: list[dict] = []
    for date_value in sorted(date_order):
        event = events_by_date[date_value]
        game_summaries: list[str] = []
        highlights: list[str] = []
        kept_games: list[dict] = []

        for game in event["games"]:
            if not game.get("results"):
                continue
            kept_games.append(game)

            winner = winner_from_results(game["results"], game["gameId"])
            game["winnerId"] = str(winner.get("playerId", ""))
            summary = build_game_summary(game["gameId"], game["results"])
            game_summaries.append(f"{GAME_NAMES[game['gameId']]}: {summary.split(': ', 1)[-1] if ': ' in summary else summary}")
            highlights.append(summary)

            for result in game["results"]:
                player_id = str(result.get("playerId", ""))
                if not player_id:
                    continue
                if result.get("points") is not None:
                    scores_by_player[player_id][game["gameId"]].append(int(result["points"]))

        event["games"] = kept_games
        event["recap"] = " ".join(game_summaries) if game_summaries else "No scored results were recorded for this game night."
        event["highlights"] = highlights or [event["recap"]]
        events.append(event)

    moon_shots = count_moon_shots(valid_rows, player_lookup)

    for event in events:
        for game in event.get("games", []):
            if game.get("gameId") != "hearts":
                continue
            for result in game.get("results", []):
                player_id = str(result.get("playerId", ""))
                if moon_shots.get(player_id):
                    result["moonShots"] = moon_shots[player_id]

    games = build_games_from_events(events)

    advanced_stats: dict[str, dict] = {}
    for player_id, event_ids in participation_dates.items():
        if len(event_ids) < 5:
            continue

        average_place = {
            game_id: sum(values) / len(values)
            for game_id, values in sorted(places_by_player[player_id].items())
            if values
        }
        average_score = {
            game_id: sum(values) / len(values)
            for game_id, values in sorted(scores_by_player[player_id].items())
            if game_id in {"hearts", "canadian-salad"} and values
        }

        advanced_stats[player_id] = {
            "events_played": len(event_ids),
            "average_place": average_place,
            "average_score": average_score,
            "moon_shots": moon_shots.get(player_id, 0),
        }

    players = sorted(players, key=lambda player: player["id"])
    advanced_stats = dict(sorted(advanced_stats.items(), key=lambda item: (-item[1]["events_played"], item[0])))
    achievements = build_achievements(
        players,
        events,
        games,
        advanced_stats,
        moon_shots,
        places_by_player,
    )

    for path in players_paths:
        write_json(path, players)
    for path in events_paths:
        write_json(path, events)
    for path in games_paths:
        write_json(path, games)
    for path in achievements_paths:
        write_json(path, achievements)
    for path in stats_paths:
        write_json(path, advanced_stats)

    print(f"Imported {len(events)} events, {len(games)} games, and {len(players)} players.")
    print("Qualified players:", ", ".join(advanced_stats.keys()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())