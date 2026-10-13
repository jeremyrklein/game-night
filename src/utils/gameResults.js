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

  const compareNumbers = (a, b, direction = 'ascending') => {
    const aNumber = Number(a)
    const bNumber = Number(b)
    const aIsNumber = Number.isFinite(aNumber)
    const bIsNumber = Number.isFinite(bNumber)

    if (aIsNumber !== bIsNumber) {
      return aIsNumber ? -1 : 1
    }
    if (!aIsNumber) {
      return 0
    }

    return direction === 'ascending' ? aNumber - bNumber : bNumber - aNumber
  }

  const sortedResults = [...results].sort((a, b) => {
    if (game.winnerId) {
      const winnerDiff = Number(b.playerId === game.winnerId) - Number(a.playerId === game.winnerId)
      if (winnerDiff !== 0) {
        return winnerDiff
      }
    }

    if (hasPosition) {
      const positionDiff = compareNumbers(a.position, b.position)
      if (positionDiff !== 0) {
        return positionDiff
      }
    }

    if (hasSeriesWon) {
      const seriesDiff = compareNumbers(a.seriesWon, b.seriesWon, 'descending')
      if (seriesDiff !== 0) {
        return seriesDiff
      }
    }

    if (hasGamesWon) {
      const gamesDiff = compareNumbers(a.gamesWon, b.gamesWon, 'descending')
      if (gamesDiff !== 0) {
        return gamesDiff
      }
    }

    if (hasPoints) {
      const lowerIsBetter = gameType === 'hearts' || gameType === 'canadian-salad'
      const pointsDiff = compareNumbers(a.points, b.points, lowerIsBetter ? 'ascending' : 'descending')
      if (pointsDiff !== 0) {
        return pointsDiff
      }
    }

    if (hasWinnings) {
      const winningsDiff = compareNumbers(a.winnings, b.winnings, 'descending')
      if (winningsDiff !== 0) {
        return winningsDiff
      }
    }

    return String(a.playerName || '').localeCompare(String(b.playerName || ''))
  })

  const explicitWinner = sortedResults.find((result) => result.playerId === game.winnerId)
  const fallbackWinner = sortedResults[0]

  return {
    gameName,
    gameType,
    results: sortedResults,
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