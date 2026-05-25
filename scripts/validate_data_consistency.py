from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "data"
ROOT_DATA = ROOT / "data"
DATASETS = [
    "players",
    "events",
    "games",
    "achievements",
    "gameTypes",
    "advanced_stats",
]


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def canonical_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def main() -> int:
    errors: list[str] = []

    loaded: dict[str, object] = {}
    for name in DATASETS:
        public_path = PUBLIC / f"{name}.json"
        root_path = ROOT_DATA / f"{name}.json"

        if not public_path.exists() or not root_path.exists():
            errors.append(f"Missing dataset files for {name}.")
            continue

        public_value = load_json(public_path)
        root_value = load_json(root_path)

        loaded[f"public:{name}"] = public_value
        loaded[f"root:{name}"] = root_value

        if canonical_json(public_value) != canonical_json(root_value):
            errors.append(f"Dataset mismatch between public/data and data for {name}.")

    players = loaded.get("public:players", [])
    events = loaded.get("public:events", [])
    games = loaded.get("public:games", [])
    game_types = loaded.get("public:gameTypes", [])

    player_ids = {str(player.get("id", "")) for player in players if str(player.get("id", ""))}
    game_type_ids = {str(game_type.get("id", "")) for game_type in game_types if str(game_type.get("id", ""))}

    for event in events:
        event_id = str(event.get("id", ""))
        for event_game in event.get("games", []):
            game_id = str(event_game.get("gameId", ""))
            winner_id = str(event_game.get("winnerId", ""))
            result_ids = {str(result.get("playerId", "")) for result in event_game.get("results", [])}

            if game_id and game_id not in game_type_ids:
                errors.append(f"Event {event_id} uses unknown game type {game_id}.")

            # A missing winnerId is allowed when no result carries a position
            # (e.g. an event we know was played but for which placements were
            # never recorded). Otherwise the winner must be a real participant.
            any_positioned = any(
                isinstance(result.get("position"), int)
                for result in event_game.get("results", [])
            )
            if not winner_id:
                if any_positioned:
                    errors.append(f"Event {event_id} game {game_id} missing winnerId.")
            elif winner_id not in result_ids:
                errors.append(f"Event {event_id} game {game_id} winnerId {winner_id} not in results.")

            for result in event_game.get("results", []):
                player_id = str(result.get("playerId", ""))
                if player_id and player_id not in player_ids:
                    errors.append(f"Event {event_id} game {game_id} references unknown player {player_id}.")

    event_game_winner = {}
    for event in events:
        event_id = str(event.get("id", ""))
        for index, event_game in enumerate(event.get("games", []), start=1):
            key = f"{event_id}-{event_game.get('gameId', '')}-{index}"
            event_game_winner[key] = str(event_game.get("winnerId", ""))

    for game in games:
        game_id = str(game.get("id", ""))
        winner = str(game.get("winner", ""))
        players_in_game = set(map(str, game.get("players", [])))
        game_type = str(game.get("gameType", ""))

        if game_type and game_type not in game_type_ids:
            errors.append(f"Game {game_id} uses unknown game type {game_type}.")

        if winner and winner not in players_in_game:
            errors.append(f"Game {game_id} winner {winner} is not listed in players.")

        expected = event_game_winner.get(game_id)
        if expected and winner != expected:
            errors.append(f"Game {game_id} winner mismatch ({winner} != {expected}).")

        for player_id in players_in_game:
            if player_id not in player_ids:
                errors.append(f"Game {game_id} references unknown player {player_id}.")

    if errors:
        print("Data consistency validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Data consistency validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
