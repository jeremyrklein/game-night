import { useEffect, useMemo, useState } from 'react'
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
import GameResultsPage from './components/GameResultsPage'
import { useHallOfFameData } from './hooks/useHallOfFameData'
import { buildGamePath, getGameDetails, parseGamePath } from './utils/gameResults'
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

function StatCard({ label, value, detail, icon: Icon, onClick }) {
  return (
    <article
      className={"glass-card stat-card" + (onClick ? " clickable" : "")}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
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
  const [selectedGameRoute, setSelectedGameRoute] = useState(() => parseGamePath(window.location.hash))
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

  const selectedGameView = useMemo(() => {
    if (!data || !computed || !selectedGameRoute) {
      return null
    }

    const event = data.events.find((candidate) => candidate.id === selectedGameRoute.eventId)
    if (!event) {
      return null
    }

    const indexedGame = event.games?.[selectedGameRoute.gameIndex]
    const eventGame = indexedGame?.gameId === selectedGameRoute.gameId
      ? indexedGame
      : event.games?.find((candidate) => candidate.gameId === selectedGameRoute.gameId)

    if (!eventGame) {
      return null
    }

    return {
      event,
      gameDetails: getGameDetails(eventGame, {
        playersById: computed.playersById,
        playerAliasMap: computed.playerAliasMap,
        gameTypesById: computed.gameTypesById,
      }),
    }
  }, [computed, data, selectedGameRoute])

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

  const clearSelectedGameRoute = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setSelectedGameRoute(null)
  }

  const handleTabChange = (tab) => {
    clearSelectedGameRoute()
    setActiveTab(tab)
  }

  useEffect(() => {
    const syncRoute = () => {
      setSelectedGameRoute(parseGamePath(window.location.hash))
    }

    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (selectedGameRoute) {
      setActiveTab('Events')
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [selectedGameRoute])

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
                Poker, Hearts, Canadian Salad, Sequence, and every
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
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container content-stack">
        {selectedGameView ? (
          <GameResultsPage
            event={selectedGameView.event}
            gameDetails={selectedGameView.gameDetails}
            onBack={() => {
              clearSelectedGameRoute()
              setActiveTab('Events')
            }}
          />
        ) : null}

        {!selectedGameView && activeTab === 'Dashboard' && (
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
                  <button type="button" onClick={() => handleTabChange('Events')}>
                    Browse events
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleTabChange('Players')}
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
                onClick={() => handleTabChange('Events')}
              />
              <StatCard
                label="Active players"
                value={summary.activePlayers}
                detail="Current core roster"
                icon={Users}
                onClick={() => handleTabChange('Players')}
              />
              <StatCard
                label="Trophies awarded"
                value={summary.trophies}
                detail="Virtual and seasonal"
                icon={Trophy}
                onClick={() => handleTabChange('Achievements')}
              />
              <StatCard
                label="Games tracked"
                value={`${summary.gameTypes}`}
                detail="Expandable rulesets"
                icon={TableProperties}
                onClick={() => handleTabChange('Events')}
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
                    <div
                      key={entry.player.id}
                      className="clickable"
                      tabIndex={0}
                      role="button"
                      onClick={() => {
                        setSelectedPlayerId(entry.player.id)
                        handleTabChange('Players')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedPlayerId(entry.player.id)
                          handleTabChange('Players')
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
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
                      <div
                        key={item.gameType}
                        className="leader-item clickable"
                        tabIndex={0}
                        role="button"
                        onClick={() => {
                          handleTabChange('Events')
                          setQuery(item.gameType)
                        }}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setQuery(item.gameType)}
                        style={{ cursor: 'pointer' }}
                      >
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

        {!selectedGameView && activeTab === 'Events' && (
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

                      <div className="stack">
                        {eventGameResults.map((game, gameIndex) => {
                          const gameDetails = getGameDetails(game, {
                            playersById: computed.playersById,
                            playerAliasMap: computed.playerAliasMap,
                            gameTypesById: computed.gameTypesById,
                          })

                          return (
                            <section key={`game-${event.id}-${game.gameId}`} className="highlight-box">
                              <p className="small-title">{gameDetails.gameName}</p>
                              {gameDetails.notes ? <p className="muted small">{gameDetails.notes}</p> : null}
                              <p className="small">
                                <strong>Winner:</strong> {gameDetails.winner?.playerName || gameDetails.winner?.playerId || '—'}
                              </p>
                              <a
                                className="results-link"
                                href={buildGamePath(event.id, game.gameId, gameIndex)}
                                onClick={() => setActiveTab('Events')}
                              >
                                {gameDetails.rounds.length > 0
                                  ? 'Open full results and round breakdown'
                                  : 'Open full results'}
                              </a>
                            </section>
                          )
                        })}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </motion.section>
        )}

        {!selectedGameView && activeTab === 'Players' && selectedPlayer && (
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

        {!selectedGameView && activeTab === 'Achievements' && (
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
