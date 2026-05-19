const DATASET_NAMES = ['players', 'events', 'games', 'achievements', 'gameTypes']

let cache = null

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function buildPlayerIdLookup(players) {
  const lookup = {}

  players.forEach((player) => {
    const nameParts = String(player.name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts[nameParts.length - 1] || ''

    const keys = [
      player.id,
      player.nickname,
      player.name,
      firstName,
      lastName,
    ]

    keys.forEach((key) => {
      const normalized = normalizeKey(key)
      if (normalized && !lookup[normalized]) {
        lookup[normalized] = player.id
      }
    })
  })

  return lookup
}

function normalizePlayerId(playerId, lookup) {
  const normalized = normalizeKey(playerId)
  return lookup[normalized] || playerId
}

function winnerFromResults(results, gameType) {
  if (!Array.isArray(results) || results.length === 0) {
    return ''
  }

  const positioned = results
    .filter((entry) => Number.isFinite(Number(entry.position)))

  // Trust positions when at least two ranks exist or someone is explicitly first.
  const hasMeaningfulPositions =
    positioned.length >= 2 || positioned.some((entry) => Number(entry.position) === 1)

  const byPosition = hasMeaningfulPositions
    ? [...positioned].sort((a, b) => Number(a.position) - Number(b.position))[0]
    : null

  if (byPosition?.playerId) {
    return byPosition.playerId
  }

  const bySeriesAndGames = [...results].sort((a, b) => {
    const seriesDiff = Number(b.seriesWon || 0) - Number(a.seriesWon || 0)
    if (seriesDiff !== 0) {
      return seriesDiff
    }

    return Number(b.gamesWon || 0) - Number(a.gamesWon || 0)
  })[0]

  if (bySeriesAndGames?.playerId && (Number(bySeriesAndGames.seriesWon || 0) > 0 || Number(bySeriesAndGames.gamesWon || 0) > 0)) {
    return bySeriesAndGames.playerId
  }

  const withPoints = results.filter((entry) => Number.isFinite(Number(entry.points)))
  if (withPoints.length >= 2) {
    const byPoints = [...withPoints].sort((a, b) => {
      const aPoints = Number(a.points)
      const bPoints = Number(b.points)
      if (gameType === 'hearts' || gameType === 'canadian-salad') {
        return aPoints - bPoints
      }
      return bPoints - aPoints
    })[0]
    if (byPoints?.playerId) {
      return byPoints.playerId
    }
  }

  const withWinnings = results.filter((entry) => Number.isFinite(Number(entry.winnings)))
  if (withWinnings.length >= 2) {
    const byWinnings = [...withWinnings].sort((a, b) => Number(b.winnings) - Number(a.winnings))[0]
    if (byWinnings?.playerId) {
      return byWinnings.playerId
    }
  }

  return results[0]?.playerId || ''
}

function scoreFromResult(result) {
  if (Number.isFinite(Number(result.points))) {
    return Number(result.points)
  }
  if (Number.isFinite(Number(result.winnings))) {
    return Number(result.winnings)
  }
  if (Number.isFinite(Number(result.gamesWon))) {
    return Number(result.gamesWon)
  }
  if (Number.isFinite(Number(result.seriesWon))) {
    return Number(result.seriesWon)
  }
  return 0
}

function gamesFromEvents(events, playerLookup) {
  const games = []

  events.forEach((event) => {
    if (!Array.isArray(event.games)) {
      return
    }

    event.games.forEach((eventGame, index) => {
      const normalizedResults = (eventGame.results || []).map((result) => ({
        ...result,
        playerId: normalizePlayerId(result.playerId, playerLookup),
      }))

      const playerIds = [...new Set(normalizedResults.map((result) => result.playerId))]
      const winner =
        normalizePlayerId(eventGame.winnerId, playerLookup) ||
        winnerFromResults(normalizedResults, eventGame.gameId)
      const scores = Object.fromEntries(
        normalizedResults.map((result) => [result.playerId, scoreFromResult(result)]),
      )

      games.push({
        id: `${event.id}-${eventGame.gameId}-${index + 1}`,
        eventId: event.id,
        gameType: eventGame.gameId,
        players: playerIds,
        winner,
        scores,
        notes: eventGame.notes || '',
      })
    })
  })

  return games
}

function normalizeGames(games, playerLookup) {
  return games.map((game) => ({
    ...game,
    players: (game.players || []).map((playerId) => normalizePlayerId(playerId, playerLookup)),
    winner: normalizePlayerId(game.winner, playerLookup),
    scores: Object.fromEntries(
      Object.entries(game.scores || {}).map(([playerId, score]) => [
        normalizePlayerId(playerId, playerLookup),
        score,
      ]),
    ),
  }))
}

async function loadDataset(name) {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const response = await fetch(`${baseUrl}data/${name}.json`)

  if (!response.ok) {
    throw new Error(`Failed loading ${name}.json (${response.status})`)
  }

  return response.json()
}

export async function loadHallOfFameData(force = false) {
  if (cache && !force) {
    return cache
  }

  const loaded = await Promise.all(DATASET_NAMES.map((name) => loadDataset(name)))
  const players = loaded[0]
  const events = loaded[1]
  const rawGames = loaded[2]
  const achievements = loaded[3]
  const gameTypes = loaded[4]

  const playerLookup = buildPlayerIdLookup(players)
  const derivedGames = gamesFromEvents(events, playerLookup)
  const normalizedGames = normalizeGames(rawGames, playerLookup)

  cache = {
    players,
    events,
    games: derivedGames.length > 0 ? derivedGames : normalizedGames,
    achievements,
    gameTypes,
  }

  return cache
}
