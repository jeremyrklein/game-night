import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Crown,
  Dice5,
  Flame,
  Lock,
  Medal,
  Search,
  Sparkles,
  Swords,
  TableProperties,
  Target,
  TrendingUp,
  Trophy,
  Unlock,
  Users,
} from 'lucide-react'
import { AUTH_SESSION_KEY, SHARED_PASSWORD } from './config/auth'
import { useHallOfFameData } from './hooks/useHallOfFameData'
import {
  buildGameTypeLeaders,
  buildLifetimeLeaderboard,
  buildPlayerStats,
} from './utils/stats'

const tabs = ['Dashboard', 'Events', 'Players', 'Achievements']

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function tierClass(tier) {
  if (tier === 'gold') {
    return 'tier-gold'
  }
  if (tier === 'silver') {
    return 'tier-silver'
  }
  return 'tier-bronze'
}

function iconForGameType(gameType) {
  const byType = {
    poker: Trophy,
    hearts: Crown,
    blackjack: Sparkles,
    'oh-heck': Target,
    'ping-pong': Swords,
    darts: Medal,
    'canadian-salad': TableProperties,
    'the-game': Flame,
  }

  return byType[gameType] || Trophy
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="glass-card stat-card">
      <div className="stat-icon-wrap">
        <div className="stat-icon">
          <Icon size={20} />
        </div>
        <ChevronRight size={16} className="muted-icon" />
      </div>
      <p className="muted small">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="muted small">{detail}</p>
    </article>
  )
}

function PasswordGate({ isUnlocked, unlockError, onUnlock, onLock }) {
  const [value, setValue] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onUnlock(value)
    setValue('')
  }

  return (
    <article className="glass-card gate-card">
      <div className="gate-head">
        <div className="gate-icon-wrap">
          {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
        </div>
        <div>
          <h3>Detailed stats access</h3>
          <p className="muted small">
            {isUnlocked
              ? 'Private leaderboard details are visible.'
              : 'Use the shared group password to reveal detailed stats.'}
          </p>
        </div>
      </div>

      {!isUnlocked ? (
        <form onSubmit={submit} className="gate-form">
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Shared password"
            aria-label="Shared password"
          />
          <button type="submit">Unlock</button>
        </form>
      ) : (
        <button type="button" className="secondary-btn" onClick={onLock}>
          Lock stats
        </button>
      )}

      {unlockError && <p className="error-text">{unlockError}</p>}
    </article>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(
    () => window.sessionStorage.getItem(AUTH_SESSION_KEY) === 'true',
  )
  const [unlockError, setUnlockError] = useState('')
  const { data, loading, error, refresh } = useHallOfFameData()

  const computed = useMemo(() => {
    if (!data) {
      return null
    }

    const playersById = Object.fromEntries(
      data.players.map((player) => [player.id, player]),
    )
    const playerAliasMap = {}
    data.players.forEach((player) => {
      const firstName = player.name.split(' ')[0]
      ;[player.id, player.nickname, player.name, firstName]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
        .forEach((key) => {
          if (!playerAliasMap[key]) {
            playerAliasMap[key] = player
          }
        })
    })
    const gameTypesById = Object.fromEntries(
      data.gameTypes.map((type) => [type.id, type]),
    )
    const statsByPlayer = buildPlayerStats(data.players, data.games)
    const leaderboard = buildLifetimeLeaderboard(data.players, data.games)
    const gameTypeLeaders = buildGameTypeLeaders(
      data.players,
      data.games,
      data.gameTypes,
    )

    const gamesByEventId = data.games.reduce((acc, game) => {
      if (!acc[game.eventId]) {
        acc[game.eventId] = []
      }
      acc[game.eventId].push(game)
      return acc
    }, {})

    const heroChampion = leaderboard[0]?.player?.name || '—'

    return {
      playersById,
      playerAliasMap,
      gameTypesById,
      statsByPlayer,
      leaderboard,
      gameTypeLeaders,
      gamesByEventId,
      heroChampion,
    }
  }, [data])

  const selectedPlayer = useMemo(() => {
    if (!data?.players?.length) {
      return null
    }

    if (selectedPlayerId) {
      return data.players.find((player) => player.id === selectedPlayerId) || data.players[0]
    }

    return data.players[0]
  }, [data, selectedPlayerId])

  const filteredEvents = useMemo(() => {
    if (!data || !computed) {
      return []
    }

    const normalized = query.trim().toLowerCase()

    return [...data.events]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((event) => {
        if (!normalized) {
          return true
        }

        const eventGames = computed.gamesByEventId[event.id] || []
        const eventWinnerNames = eventGames
          .map((game) => computed.playersById[game.winner]?.name || game.winner)
          .join(' ')

        const gameNames = eventGames
          .map((game) => computed.gameTypesById[game.gameType]?.name || game.gameType)
          .join(' ')

        const haystack = [
          event.title,
          event.location,
          event.recap,
          ...event.highlights,
          gameNames,
          eventWinnerNames,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalized)
      })
  }, [computed, data, query])

  const summary = useMemo(() => {
    if (!data || !computed) {
      return null
    }

    return {
      eventCount: data.events.length,
      activePlayers: data.players.filter((player) => player.active).length,
      trophies: data.achievements.length,
      gameTypes: data.gameTypes.length,
    }
  }, [computed, data])

  const handleUnlock = (candidatePassword) => {
    if (candidatePassword === SHARED_PASSWORD) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, 'true')
      setIsUnlocked(true)
      setUnlockError('')
      return
    }

    setUnlockError('Incorrect password')
  }

  const handleLock = () => {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY)
    setIsUnlocked(false)
  }

  if (loading) {
    return <div className="status">Loading game night data…</div>
  }

  if (error || !data || !computed) {
    return (
      <div className="status stack">
        <p>Could not load data files from /public/data.</p>
        <p className="error-text">{error}</p>
        <button onClick={() => refresh(true)} type="button">
          Retry
        </button>
      </div>
    )
  }

  const miniLeaders = computed.leaderboard.slice(0, 4)
  const maxWins = Math.max(...miniLeaders.map((item) => item.stats.wins), 1)

  return (
    <div className="premium-shell">
      <header className="premium-header">
        <div className="container row between wrap-gap">
          <div className="row gap-12">
            <div className="brand-icon">
              <Dice5 size={22} />
            </div>
            <div>
              <h1>Game Night Hall of Fame</h1>
              <p className="muted">
                Poker, Hearts, Canadian Salad, Oh Heck, darts, ping pong, and every
                disputed tiebreaker.
              </p>
            </div>
          </div>

          <nav className="tab-nav" aria-label="Sections">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={cx('tab-btn', activeTab === tab && 'tab-btn-active')}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container content-stack">
        {activeTab === 'Dashboard' && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="hero-grid">
              <article className="hero-card">
                <div className="hero-season">Season 2026</div>
                <p className="hero-chip">
                  <Flame size={15} /> Current champion: {computed.heroChampion}
                </p>
                <h2>A living archive for every game night.</h2>
                <p>
                  Track event dates, winners, player dossiers, trophies, highlights,
                  and private stats behind a simple shared-password gate.
                </p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveTab('Events')}>
                    Browse events
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setActiveTab('Players')}
                  >
                    View dossiers
                  </button>
                </div>
              </article>

              <PasswordGate
                isUnlocked={isUnlocked}
                unlockError={unlockError}
                onUnlock={handleUnlock}
                onLock={handleLock}
              />
            </div>

            <section className="stats-grid">
              <StatCard
                label="Recorded events"
                value={summary.eventCount}
                detail="Archived across all sessions"
                icon={CalendarDays}
              />
              <StatCard
                label="Active players"
                value={summary.activePlayers}
                detail="Current core roster"
                icon={Users}
              />
              <StatCard
                label="Trophies awarded"
                value={summary.trophies}
                detail="Virtual and seasonal"
                icon={Trophy}
              />
              <StatCard
                label="Games tracked"
                value={`${summary.gameTypes}+`}
                detail="Expandable rulesets"
                icon={TableProperties}
              />
            </section>

            <section className="leaders-grid">
              <article className="glass-card">
                <div className="row between">
                  <div>
                    <h3>Overall leaders</h3>
                    <p className="muted small">
                      Private details are hidden until unlocked.
                    </p>
                  </div>
                  <TrendingUp size={18} className="muted-icon" />
                </div>

                <div className="mini-bars">
                  {miniLeaders.map((entry, index) => (
                    <div key={entry.player.id}>
                      <div className="row between small-row">
                        <span className="small-title">
                          {index + 1}. {entry.player.name}
                        </span>
                        <span className="muted small">
                          {isUnlocked ? `${entry.stats.wins} wins` : 'Shared password required'}
                        </span>
                      </div>
                      <div className="bar-track">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(8, (entry.stats.wins / maxWins) * 100)}%`,
                          }}
                          transition={{ duration: 0.8, delay: index * 0.05 }}
                          className={cx('bar-fill', !isUnlocked && 'bar-fill-blur')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card">
                <h3>Game leaders</h3>
                <div className="game-leader-grid">
                  {computed.gameTypeLeaders.map((item) => {
                    const gameType = data.gameTypes.find(
                      (type) => type.name === item.gameType,
                    )
                    const Icon = iconForGameType(gameType?.id)

                    return (
                      <div key={item.gameType} className="leader-item">
                        <div className="row gap-8">
                          <div className="mini-icon">
                            <Icon size={15} />
                          </div>
                          <div>
                            <p className="small-title">{item.gameType}</p>
                            <p className="muted tiny">{item.gamesPlayed} sessions</p>
                          </div>
                        </div>
                        <p className="muted small">
                          Leader: <strong>{item.leaderName}</strong>
                        </p>
                        <p className={cx('small', !isUnlocked && 'blurred')}>
                          {item.wins} wins
                        </p>
                      </div>
                    )
                  })}
                </div>
              </article>
            </section>
          </motion.section>
        )}

        {activeTab === 'Events' && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="row between wrap-gap">
              <div>
                <h2 className="section-title">Event archive</h2>
                <p className="muted">
                  Dates, locations, game winners, photos, recaps, and highlights.
                </p>
              </div>
              <div className="search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search events, games, winners"
                  aria-label="Search events"
                />
              </div>
            </div>

            <div className="event-grid">
              {filteredEvents.map((event) => {
                const eventGames = computed.gamesByEventId[event.id] || []
                const eventGameResults = event.games || []
                const [year, month, day] = String(event.date)
                  .split('-')
                  .map((value) => Number(value))
                const eventDate = new Date(year, (month || 1) - 1, day || 1)
                const recapText = String(event.recap || '').replace(/^#\s*/gm, '').trim()

                return (
                  <article key={event.id} className="glass-card event-card">
                    {event.photo ? (
                      <img
                        src={event.photo}
                        alt={event.title}
                        className="event-photo"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <div className="event-body">
                      <div className="row between small">
                        <span>
                          {eventDate.toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>{event.location || ' '}</span>
                      </div>
                      <h3>{event.title}</h3>
                      <p className="muted small">{recapText}</p>

                      <div className="tag-row">
                        {eventGames.map((game) => (
                          <span key={game.id} className="tag">
                            {computed.gameTypesById[game.gameType]?.name || game.gameType}
                          </span>
                        ))}
                      </div>

                      <div className="highlight-box">
                        <p className="small-title">Winners</p>
                        <ul>
                          {eventGames.map((game) => (
                            <li key={`w-${game.id}`}>
                              {computed.gameTypesById[game.gameType]?.name || game.gameType}:{' '}
                              {computed.playersById[game.winner]?.name || game.winner}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {true && (
                        <div className="highlight-box">
                          <p className="small-title">Complete Results ({eventGameResults.length} games)</p>
                          <div className="results-tables">
                            {eventGameResults.map((game) => {
                              const gameName =
                                computed.gameTypesById[game.gameId]?.name || game.gameId
                              const results = (game.results || []).map((result) => {
                                const aliasKey = String(result.playerId || '')
                                  .trim()
                                  .toLowerCase()
                                const player = computed.playerAliasMap[aliasKey]
                                return {
                                  ...result,
                                  playerName: player?.name || result.playerId,
                                }
                              })

                              const hasPosition = results.some((r) =>
                                Number.isFinite(Number(r.position))
                              )
                              const hasGamesWon = results.some((r) =>
                                Number.isFinite(Number(r.gamesWon))
                              )
                              const hasSeriesWon = results.some((r) =>
                                Number.isFinite(Number(r.seriesWon))
                              )
                              const hasPoints = results.some((r) =>
                                Number.isFinite(Number(r.points))
                              )
                              const hasWinnings = results.some((r) =>
                                Number.isFinite(Number(r.winnings))
                              )

                              return (
                                <div key={`table-${event.id}-${game.gameId}`} className="game-results-table">
                                  <p className="muted tiny">{gameName}</p>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Player</th>
                                        {hasPosition && <th>Place</th>}
                                        {hasGamesWon && <th>Games</th>}
                                        {hasSeriesWon && <th>Series</th>}
                                        {hasPoints && <th>Points</th>}
                                        {hasWinnings && <th>Winnings</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {results.map((result, idx) => (
                                        <tr key={`${event.id}-${game.gameId}-${idx}`}>
                                          <td>{result.playerName}</td>
                                          {hasPosition && (
                                            <td>
                                              {Number.isFinite(Number(result.position))
                                                ? `#${result.position}`
                                                : '—'}
                                            </td>
                                          )}
                                          {hasGamesWon && (
                                            <td>
                                              {Number.isFinite(Number(result.gamesWon))
                                                ? result.gamesWon
                                                : '—'}
                                            </td>
                                          )}
                                          {hasSeriesWon && (
                                            <td>
                                              {Number.isFinite(Number(result.seriesWon))
                                                ? result.seriesWon
                                                : '—'}
                                            </td>
                                          )}
                                          {hasPoints && (
                                            <td>
                                              {Number.isFinite(Number(result.points))
                                                ? result.points
                                                : '—'}
                                            </td>
                                          )}
                                          {hasWinnings && (
                                            <td>
                                              {Number.isFinite(Number(result.winnings))
                                                ? `$${result.winnings}`
                                                : '—'}
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </motion.section>
        )}

        {activeTab === 'Players' && selectedPlayer && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="players-grid"
          >
            <article className="glass-card player-list-card">
              <h2 className="section-title">Player dossiers</h2>
              <div className="player-list">
                {data.players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={cx(
                      'player-list-item',
                      selectedPlayer.id === player.id && 'player-list-item-active',
                    )}
                  >
                    <div className="avatar-fallback">{player.name.slice(0, 1)}</div>
                    <div>
                      <p className="small-title">{player.name}</p>
                      <p className="muted tiny">{player.nickname}</p>
                    </div>
                  </button>
                ))}
              </div>
            </article>

            <article className="glass-card dossier-card">
              <div className="dossier-hero">
                <div className="dossier-left">
                  <div className="avatar-large">{selectedPlayer.name.slice(0, 1)}</div>
                  <p className="muted tiny">Joined {selectedPlayer.joinedYear}</p>
                  <h3>{selectedPlayer.name}</h3>
                  <p className="accent">{selectedPlayer.nickname}</p>
                </div>

                <div className="dossier-right">
                  <div className="row between wrap-gap">
                    <div>
                      <p className="muted tiny upcase">Specialty</p>
                      <p className="small-title">{selectedPlayer.specialty}</p>
                    </div>
                    <button type="button" className="secondary-btn">
                      <Camera size={14} /> Upload photo
                    </button>
                  </div>

                  <p className="muted">{selectedPlayer.bio}</p>

                  <div className="dossier-stats-grid">
                    <div className="chip-card">
                      <p className="muted tiny">Wins</p>
                      <p className={cx('chip-value', !isUnlocked && 'blurred')}>
                        {computed.statsByPlayer[selectedPlayer.id]?.wins || 0}
                      </p>
                    </div>
                    <div className="chip-card">
                      <p className="muted tiny">Games</p>
                      <p className={cx('chip-value', !isUnlocked && 'blurred')}>
                        {computed.statsByPlayer[selectedPlayer.id]?.gamesPlayed || 0}
                      </p>
                    </div>
                    <div className="chip-card">
                      <p className="muted tiny">Win Rate</p>
                      <p className={cx('chip-value', !isUnlocked && 'blurred')}>
                        {(
                          computed.statsByPlayer[selectedPlayer.id]?.winRate || 0
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <p className="muted tiny">
                      Unlock detailed stats from dashboard to reveal private records.
                    </p>
                  )}
                </div>
              </div>
            </article>
          </motion.section>
        )}

        {activeTab === 'Achievements' && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="section-title">Achievements and virtual trophies</h2>
            <p className="muted">
              One-off moments, recurring records, seasonal titles, and legendary honors.
            </p>

            <div className="achievement-grid">
              {[...data.achievements]
                .sort((a, b) => b.dateAwarded.localeCompare(a.dateAwarded))
                .map((achievement) => (
                  <article key={achievement.id} className="glass-card achievement-card">
                    <div className="row between">
                      <div className={cx('tier-icon', tierClass(achievement.tier))}>
                        <Trophy size={18} />
                      </div>
                      <span className="tag tiny">{achievement.tier.toUpperCase()}</span>
                    </div>

                    <h3>{achievement.name}</h3>
                    <p className="muted small">
                      Holder:{' '}
                      <strong>
                        {computed.playersById[achievement.holder]?.name || achievement.holder}
                      </strong>
                    </p>
                    <p className="muted small">{achievement.reason}</p>
                  </article>
                ))}
            </div>
          </motion.section>
        )}

      </main>
    </div>
  )
}

export default App
