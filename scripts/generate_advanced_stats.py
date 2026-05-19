import json
from collections import defaultdict

# Load events data
with open("c:/Projects/game-night/public/data/events.json", "r") as file:
    events = json.load(file)

# Initialize data structures
player_stats = defaultdict(lambda: {
    "events": 0,
    "placements": defaultdict(list),
    "scores": defaultdict(list),
    "moon_shots": 0
})

# Process events
def process_event(event):
    for game in event["games"]:
        game_id = game["gameId"]
        for result in game["results"]:
            player_id = result["playerId"]
            player_stats[player_id]["events"] += 1

            # Track placements
            if "position" in result:
                player_stats[player_id]["placements"][game_id].append(result["position"])

            # Track scores for specific games
            if game_id in ["hearts", "canadian-salad"] and "points" in result:
                player_stats[player_id]["scores"][game_id].append(result["points"])

            # Track moon shots in Hearts
            if game_id == "hearts" and "moonShots" in result:
                player_stats[player_id]["moon_shots"] += result["moonShots"]

for event in events:
    process_event(event)

# Filter players with at least 5 events
qualified_players = {
    player: stats for player, stats in player_stats.items() if stats["events"] >= 5
}

# Calculate advanced stats
def calculate_advanced_stats():
    advanced_stats = {}
    for player, stats in qualified_players.items():
        advanced_stats[player] = {
            "average_place": {
                game: sum(places) / len(places) for game, places in stats["placements"].items()
            },
            "average_score": {
                game: sum(scores) / len(scores) for game, scores in stats["scores"].items()
            },
            "moon_shots": stats["moon_shots"]
        }
    return advanced_stats

# Generate stats
advanced_stats = calculate_advanced_stats()

# Output results
with open("c:/Projects/game-night/public/data/advanced_stats.json", "w") as file:
    json.dump(advanced_stats, file, indent=4)

print("Advanced stats generated and saved to advanced_stats.json.")