export function buildGamePath(eventId, gameId, gameIndex = 0) {
  return `#game/${encodeURIComponent(eventId)}/${encodeURIComponent(gameId)}/${gameIndex}`
}

export function parseGamePath(hash) {
  const match = String(hash || '').match(/^#game\/([^/]+)\/([^/]+)(?:\/(\d+))?$/)
  if (!match) {
    return null
  }

  return {
    eventId: decodeURIComponent(match[1]),
    gameId: decodeURIComponent(match[2]),
    gameIndex: Number(match[3] || 0),
  }
}

export function formatRoundLabel(round, index) {
  const step = String(round?.step || '').trim()
  const label = String(round?.label || '').trim()

  if (step && label) {
    return `${step} · ${label}`
  }
  if (label) {
    return label
  }
  if (step) {
    return `Round ${step}`
  }
  return `Round ${index + 1}`
}

export function getGameDetails(game, { playersById, playerAliasMap = {}, gameTypesById }) {
  const gameType = game.gameId || game.gameType
  const gameName = gameTypesById[gameType]?.name || gameType

  const results = (game.results || []).map((result) => {
    const aliasKey = String(result.playerId || '')
      .trim()
      .toLowerCase()
    const aliasedPlayer = playerAliasMap[aliasKey]
    const player = aliasedPlayer || playersById[result.playerId]

    return {
      ...result,
      playerName: player?.name || result.playerName || result.playerId,
    }
  })

  const hasPosition = results.some((result) => Number.isFinite(Number(result.position)))
  const hasGamesWon = results.some((result) => Number.isFinite(Number(result.gamesWon)))
  const hasSeriesWon = results.some((result) => Number.isFinite(Number(result.seriesWon)))
  const hasPoints = results.some((result) => Number.isFinite(Number(result.points)))
  const hasWinnings = results.some((result) => Number.isFinite(Number(result.winnings)))

  const fallbackWinner = [...results].sort((a, b) => {
    if (hasPosition) {
      const positionDiff = Number(a.position) - Number(b.position)
      if (positionDiff !== 0) {
        return positionDiff
      }
    }

    if (hasSeriesWon) {
      const seriesDiff = Number(b.seriesWon || 0) - Number(a.seriesWon || 0)
      if (seriesDiff !== 0) {
        return seriesDiff
      }
    }

    if (hasGamesWon) {
      const gamesDiff = Number(b.gamesWon || 0) - Number(a.gamesWon || 0)
      if (gamesDiff !== 0) {
        return gamesDiff
      }
    }

    if (hasPoints) {
      const lowerIsBetter = gameType === 'hearts' || gameType === 'canadian-salad'
      const pointsDiff = lowerIsBetter
        ? Number(a.points || 0) - Number(b.points || 0)
        : Number(b.points || 0) - Number(a.points || 0)
      if (pointsDiff !== 0) {
        return pointsDiff
      }
    }

    if (hasWinnings) {
      const winningsDiff = Number(b.winnings || 0) - Number(a.winnings || 0)
      if (winningsDiff !== 0) {
        return winningsDiff
      }
    }

    return String(a.playerName || '').localeCompare(String(b.playerName || ''))
  })[0]

  const explicitWinner = results.find((result) => result.playerId === game.winnerId)

  return {
    gameName,
    gameType,
    results,
    rounds: Array.isArray(game.rounds) ? game.rounds : [],
    notes: String(game.notes || '').trim(),
    winner: explicitWinner || fallbackWinner,
    hasPosition,
    hasGamesWon,
    hasSeriesWon,
    hasPoints,
    hasWinnings,
  }
}