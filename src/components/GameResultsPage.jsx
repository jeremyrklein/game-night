import { ArrowLeft } from 'lucide-react'
import { formatRoundLabel } from '../utils/gameResults'

export default function GameResultsPage({ event, gameDetails, onBack }) {
  const [year, month, day] = String(event.date)
    .split('-')
    .map((value) => Number(value))
  const eventDate = new Date(year, (month || 1) - 1, day || 1)

  return (
    <section className="results-page stack">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to events
      </button>

      <article className="glass-card results-hero-card">
        <p className="muted tiny upcase">Game results</p>
        <h2 className="section-title">{gameDetails.gameName}</h2>
        <p className="muted">
          {event.title} ·{' '}
          {eventDate.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {event.location ? ` · ${event.location}` : ''}
        </p>
        <p className="small">
          <strong>Winner:</strong> {gameDetails.winner?.playerName || gameDetails.winner?.playerId || '—'}
        </p>
        {gameDetails.notes ? <p className="muted small">{gameDetails.notes}</p> : null}
      </article>

      <article className="glass-card results-section-card">
        <h3>Final results</h3>
        <div className="game-results-table standalone-results-table">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                {gameDetails.hasPosition ? <th>Place</th> : null}
                {gameDetails.hasGamesWon ? <th>Games</th> : null}
                {gameDetails.hasSeriesWon ? <th>Series</th> : null}
                {gameDetails.hasPoints ? <th>Points</th> : null}
                {gameDetails.hasWinnings ? <th>Winnings</th> : null}
              </tr>
            </thead>
            <tbody>
              {gameDetails.results.map((result, index) => (
                <tr key={`${event.id}-${gameDetails.gameType}-${index}`}>
                  <td>{result.playerName}</td>
                  {gameDetails.hasPosition ? (
                    <td>{Number.isFinite(Number(result.position)) ? `#${result.position}` : '—'}</td>
                  ) : null}
                  {gameDetails.hasGamesWon ? (
                    <td>{Number.isFinite(Number(result.gamesWon)) ? result.gamesWon : '—'}</td>
                  ) : null}
                  {gameDetails.hasSeriesWon ? (
                    <td>{Number.isFinite(Number(result.seriesWon)) ? result.seriesWon : '—'}</td>
                  ) : null}
                  {gameDetails.hasPoints ? (
                    <td>{Number.isFinite(Number(result.points)) ? result.points : '—'}</td>
                  ) : null}
                  {gameDetails.hasWinnings ? (
                    <td>{Number.isFinite(Number(result.winnings)) ? `$${result.winnings}` : '—'}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {gameDetails.rounds.length > 0 ? (
        <article className="glass-card results-section-card">
          <h3>Round breakdown</h3>
          <div className="game-results-table standalone-results-table">
            <table>
              <thead>
                <tr>
                  <th>Round</th>
                  {gameDetails.results.map((result) => (
                    <th key={`${event.id}-${gameDetails.gameType}-${result.playerId}-round-head`}>
                      {result.playerName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameDetails.rounds.map((round, roundIndex) => {
                  const valuesByPlayerId = Object.fromEntries(
                    (round.values || []).map((value) => [value.playerId, value.value]),
                  )

                  return (
                    <tr key={`${event.id}-${gameDetails.gameType}-round-${roundIndex}`}>
                      <td>{formatRoundLabel(round, roundIndex)}</td>
                      {gameDetails.results.map((result) => (
                        <td key={`${event.id}-${gameDetails.gameType}-round-${roundIndex}-${result.playerId}`}>
                          {valuesByPlayerId[result.playerId] !== '' &&
                          valuesByPlayerId[result.playerId] !== undefined
                            ? String(valuesByPlayerId[result.playerId])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  )
}