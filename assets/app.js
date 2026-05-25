/* Game Night Hall of Fame - plain JS, no build step.
 * Loads data/*.json, renders tabs, supports hash route #game/<eventId>/<gameId>/<index>
 * for round-by-round results, and a shared-password gate that blurs private stats.
 */

const SHARED_PASSWORD = 'Rush2112';
const AUTH_SESSION_KEY = 'game-night-unlocked';
const TABS = ['Dashboard', 'Events', 'Players', 'Insights', 'Achievements'];

const state = {
  data: null,
  computed: null,
  activeTab: 'Dashboard',
  query: '',
  selectedPlayerId: null,
  insightGameType: 'all',
  selectedGameRoute: null,
  isUnlocked: true,
  unlockError: '',
  loading: true,
  error: null,
};

/* ---------- tiny utils ---------- */
const $root = () => document.getElementById('root');
function h(html) { return html; } // tag for readability
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function cx(...c) { return c.filter(Boolean).join(' '); }
function toNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function formatDate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y) return '';
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ---------- inline SVG icons (subset of lucide) ---------- */
const ICON = {
  dice:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/></svg>',
  lock:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 4h3v3a3 3 0 0 1-3 3M7 4H4v3a3 3 0 0 0 3 3"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  table: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  search:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  chev:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-1 5 2 5 3-4 1-7c3 1 6 5 6 9a6 6 0 1 1-12 0c0-5 6-8 6-12z"/></svg>',
  trend: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>',
  back:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  poker: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  sequence: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/></svg>',
  ohHeck: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="3"/><text x="12" y="15.6" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="8.5" font-weight="800" fill="currentColor" stroke="none">OH!</text></svg>',
  tableTennis: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="11" r="5.5"/><path d="M13.2 7.1l5.6-3.2a1 1 0 0 1 1.4.4l1.1 1.9a1 1 0 0 1-.4 1.4l-5.6 3.2"/><circle cx="18" cy="19" r="1" fill="currentColor" stroke="none"/></svg>',
};

function iconForAchievement(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('hearts') || n.includes('moon')) return ICON.heart;
  if (n.includes('poker')) return ICON.poker;
  if (n.includes('sequence')) return ICON.sequence;
  if (n.includes('oh heck')) return ICON.ohHeck;
  if (n.includes('table tennis') || n.includes('ping')) return ICON.tableTennis;
  return ICON.trophy;
}

function gameTypeForAchievement(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('hearts') || n.includes('moon')) return 'hearts';
  if (n.includes('poker')) return 'poker';
  if (n.includes('sequence')) return 'sequence';
  if (n.includes('oh heck')) return 'oh-heck';
  if (n.includes('table tennis') || n.includes('ping')) return 'table-tennis';
  return null;
}

// Most recent event date that contributed to the record:
// the latest event in which any holder played a game of the relevant type.
// If the achievement has no game-type keyword, fall back to the latest event
// any holder participated in. Returns YYYY-MM-DD or ''.
function computeAchievedDate(achievement, events) {
  const holders = (Array.isArray(achievement.holders) && achievement.holders.length
    ? achievement.holders
    : [achievement.holder]).filter(Boolean);
  if (!holders.length || !Array.isArray(events)) return '';
  const holderSet = new Set(holders);
  const gameType = gameTypeForAchievement(achievement.name);

  let best = '';
  for (const ev of events) {
    const date = String(ev.date || '');
    if (!date || (best && date <= best)) continue;
    const games = ev.games || [];
    const match = games.some((g) => {
      if (gameType && g.gameId !== gameType) return false;
      return (g.results || []).some((r) => holderSet.has(r.playerId));
    });
    if (match) best = date;
  }
  return best;
}

/* ---------- data loader (mirrors src/services/dataLoader.js semantics) ---------- */
function normalizeKey(v) { return String(v || '').trim().toLowerCase(); }
function buildPlayerAliasMap(players) {
  const map = {};
  players.forEach((p) => {
    const parts = String(p.name || '').trim().split(/\s+/);
    [p.id, p.nickname, p.name, parts[0], parts[parts.length - 1]].forEach((k) => {
      const key = normalizeKey(k);
      if (key && !map[key]) map[key] = p;
    });
  });
  return map;
}

async function loadJson(name) {
  const r = await fetch(`./data/${name}.json`, { cache: 'reload' });
  if (!r.ok) throw new Error(`Failed to load ${name}.json (${r.status})`);
  return r.json();
}

async function loadAllData() {
  const [players, events, gamesRaw, achievements, gameTypes] = await Promise.all([
    loadJson('players'),
    loadJson('events'),
    loadJson('games'),
    loadJson('achievements'),
    loadJson('gameTypes'),
  ]);

  const aliasMap = buildPlayerAliasMap(players);
  const normId = (id) => aliasMap[normalizeKey(id)]?.id || id;

  // Derive normalized "games" list from events (one entry per played game).
  const games = [];
  events.forEach((event) => {
    (event.games || []).forEach((g, idx) => {
      const results = (g.results || []).map((r) => ({ ...r, playerId: normId(r.playerId) }));
      const playerIds = [...new Set(results.map((r) => r.playerId))];
      const winner = normId(g.winnerId) || pickWinner(results, g.gameId);
      const scores = {};
      results.forEach((r) => {
        const s = scoreFromResult(r);
        if (s != null) scores[r.playerId] = s;
      });
      games.push({
        id: `${event.id}-${g.gameId}-${idx + 1}`,
        eventId: event.id,
        gameType: g.gameId,
        players: playerIds,
        winner,
        scores,
        notes: g.notes || '',
      });
    });
  });

  // Fall back to raw games file only if events produced nothing.
  return {
    players,
    events,
    games: games.length ? games : gamesRaw,
    achievements,
    gameTypes,
    _aliasMap: aliasMap,
  };
}

function pickWinner(results, gameType) {
  if (!Array.isArray(results) || !results.length) return '';
  const positioned = results.filter((r) => Number.isFinite(Number(r.position)));
  const meaningful = positioned.length >= 2 || positioned.some((r) => Number(r.position) === 1);
  if (meaningful) {
    const top = [...positioned].sort((a, b) => Number(a.position) - Number(b.position))[0];
    if (top?.playerId) return top.playerId;
  }
  const lowerBetter = gameType === 'hearts' || gameType === 'canadian-salad';
  const withPoints = results.filter((r) => Number.isFinite(Number(r.points)));
  if (withPoints.length >= 2) {
    const top = [...withPoints].sort((a, b) => lowerBetter
      ? Number(a.points) - Number(b.points)
      : Number(b.points) - Number(a.points))[0];
    if (top?.playerId) return top.playerId;
  }
  return results[0]?.playerId || '';
}

function scoreFromResult(r) {
  for (const k of ['points', 'winnings', 'gamesWon', 'seriesWon']) {
    if (r[k] === undefined || r[k] === null || r[k] === '') continue;
    const n = Number(r[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/* ---------- stats ---------- */
function buildPlayerStats(players, games) {
  const map = {};
  players.forEach((p) => {
    map[p.id] = { playerId: p.id, wins: 0, gamesPlayed: 0, totalScore: 0, winRate: 0, averageScore: 0, byGameType: {} };
  });
  games.forEach((g) => {
    (g.players || []).forEach((pid) => {
      const s = map[pid]; if (!s) return;
      s.gamesPlayed += 1;
      s.byGameType[g.gameType] = (s.byGameType[g.gameType] || 0) + 1;
      s.totalScore += toNumber(g.scores?.[pid]);
    });
    if (map[g.winner]) map[g.winner].wins += 1;
  });
  Object.values(map).forEach((s) => {
    if (s.gamesPlayed > 0) {
      s.winRate = (s.wins / s.gamesPlayed) * 100;
      s.averageScore = s.totalScore / s.gamesPlayed;
    }
  });
  return map;
}
function buildLifetimeLeaderboard(players, games) {
  const stats = buildPlayerStats(players, games);
  return players.map((p) => ({ player: p, stats: stats[p.id] }))
    .sort((a, b) => (b.stats.wins - a.stats.wins) || (b.stats.winRate - a.stats.winRate));
}
function buildGameTypeLeaders(players, games, gameTypes) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  return gameTypes.map((t) => {
    const filtered = games.filter((g) => g.gameType === t.id);
    const wins = {};
    filtered.forEach((g) => { wins[g.winner] = (wins[g.winner] || 0) + 1; });
    const top = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
    return {
      gameType: t.name,
      gameTypeId: t.id,
      gamesPlayed: filtered.length,
      leaderName: top ? (byId[top[0]]?.name || top[0]) : '—',
      wins: top ? top[1] : 0,
    };
  });
}

/* ---------- per-game details (for results page + event cards) ---------- */
function getGameDetails(eventGame, ctx) {
  const { playersById, playerAliasMap, gameTypesById } = ctx;
  const gameType = eventGame.gameId || eventGame.gameType;
  const gameName = gameTypesById[gameType]?.name || gameType;

  const results = (eventGame.results || []).map((r) => {
    const aliased = playerAliasMap[normalizeKey(r.playerId)];
    const player = aliased || playersById[r.playerId];
    return { ...r, playerName: player?.name || r.playerName || r.playerId };
  });

  const hasPosition  = results.some((r) => Number.isFinite(Number(r.position)));
  const hasGamesWon  = results.some((r) => Number.isFinite(Number(r.gamesWon)));
  const hasSeriesWon = results.some((r) => Number.isFinite(Number(r.seriesWon)));
  const hasPoints    = results.some((r) => Number.isFinite(Number(r.points)));
  const hasWinnings  = results.some((r) => Number.isFinite(Number(r.winnings)));

  const lowerBetter = gameType === 'hearts' || gameType === 'canadian-salad';
  const fallback = [...results].sort((a, b) => {
    if (hasPosition) { const d = Number(a.position) - Number(b.position); if (d) return d; }
    if (hasSeriesWon) { const d = Number(b.seriesWon || 0) - Number(a.seriesWon || 0); if (d) return d; }
    if (hasGamesWon)  { const d = Number(b.gamesWon || 0)  - Number(a.gamesWon || 0);  if (d) return d; }
    if (hasPoints)    { const d = lowerBetter
      ? Number(a.points || 0) - Number(b.points || 0)
      : Number(b.points || 0) - Number(a.points || 0); if (d) return d; }
    if (hasWinnings)  { const d = Number(b.winnings || 0) - Number(a.winnings || 0); if (d) return d; }
    return String(a.playerName || '').localeCompare(String(b.playerName || ''));
  })[0];
  const explicit = results.find((r) => r.playerId === eventGame.winnerId);

  return {
    gameName, gameType, results,
    rounds: Array.isArray(eventGame.rounds) ? eventGame.rounds : [],
    notes: String(eventGame.notes || '').trim(),
    winner: explicit || fallback,
    hasPosition, hasGamesWon, hasSeriesWon, hasPoints, hasWinnings,
  };
}
function winnerLine(winner, playersById) {
  if (!winner) return '—';
  const player = playersById[winner.playerId];
  const name = winner.playerName || winner.playerId || '—';
  const initial = (player?.name || name || '?').trim().charAt(0).toUpperCase();
  const avatar = player?.avatar
    ? `<img class="avatar-inline" src="${escapeHtml(player.avatar)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar-inline',textContent:'${escapeHtml(initial)}'}))" />`
    : `<span class="avatar-inline">${escapeHtml(initial)}</span>`;
  return `${avatar}<span>${escapeHtml(name)}</span>`;
}

function formatRoundLabel(round, i) {
  const step = String(round?.step || '').trim();
  const label = String(round?.label || '').trim();
  if (step && label) return `${step} · ${label}`;
  if (label) return label;
  if (step) return `Round ${step}`;
  return `Round ${i + 1}`;
}

/* ---------- compute everything once per data load ---------- */
function compute(data) {
  const playersById = Object.fromEntries(data.players.map((p) => [p.id, p]));
  const gameTypesById = Object.fromEntries(data.gameTypes.map((t) => [t.id, t]));
  const playerAliasMap = buildPlayerAliasMap(data.players);
  const statsByPlayer = buildPlayerStats(data.players, data.games);
  const leaderboard = buildLifetimeLeaderboard(data.players, data.games);
  const gameTypeLeaders = buildGameTypeLeaders(data.players, data.games, data.gameTypes);
  const gamesByEventId = data.games.reduce((acc, g) => {
    (acc[g.eventId] = acc[g.eventId] || []).push(g);
    return acc;
  }, {});
  // First-seen year per player: earliest event date they appear in (any game).
  const firstYearByPlayer = {};
  const eventsById = Object.fromEntries(data.events.map((e) => [e.id, e]));
  data.games.forEach((g) => {
    const ev = eventsById[g.eventId];
    if (!ev) return;
    const year = parseInt(String(ev.date).slice(0, 4), 10);
    if (!year) return;
    (g.players || []).forEach((pid) => {
      if (firstYearByPlayer[pid] == null || year < firstYearByPlayer[pid]) {
        firstYearByPlayer[pid] = year;
      }
    });
  });
  return {
    playersById, gameTypesById, playerAliasMap,
    statsByPlayer, leaderboard, gameTypeLeaders, gamesByEventId,
    firstYearByPlayer,
    heroChampion: leaderboard[0]?.player?.name || '—',
  };
}

/* ---------- hash routing for results page ---------- */
function buildGamePath(eventId, gameId, idx = 0) {
  return `#game/${encodeURIComponent(eventId)}/${encodeURIComponent(gameId)}/${idx}`;
}
function parseGamePath(hash) {
  const m = String(hash || '').match(/^#game\/([^/]+)\/([^/]+)(?:\/(\d+))?$/);
  if (!m) return null;
  return {
    eventId: decodeURIComponent(m[1]),
    gameId: decodeURIComponent(m[2]),
    gameIndex: Number(m[3] || 0),
  };
}

/* ---------- rendering ---------- */
function render() {
  const root = $root();
  if (state.loading) { root.innerHTML = `<div class="status">Loading game night data…</div>`; return; }
  if (state.error || !state.data || !state.computed) {
    root.innerHTML = `<div class="status stack">
      <p>Could not load data files from /data.</p>
      <p class="error-text">${escapeHtml(state.error || '')}</p>
      <button type="button" data-action="retry">Retry</button>
    </div>`;
    return;
  }

  root.innerHTML = `
    <div class="premium-shell">
      ${renderHeader()}
      <main class="container content-stack">
        ${state.selectedGameRoute ? renderResultsPage() : renderActiveTab()}
      </main>
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="premium-header">
      <div class="container row between wrap-gap">
        <div class="row gap-12">
          <div class="brand-icon"><img src="./assets/game-night-icon.png" alt="Game Night" /></div>
          <div>
            <h1>Game Night Hall of Fame</h1>
            <p class="muted">Suffering through dirty jokes since 1998.</p>
          </div>
        </div>
        <nav class="tab-nav" aria-label="Sections">
          ${TABS.map((t) => `<button type="button" class="${cx('tab-btn', state.activeTab === t && 'tab-btn-active')}" data-action="tab" data-tab="${t}">${t}</button>`).join('')}
        </nav>
      </div>
    </header>
  `;
}

function renderActiveTab() {
  switch (state.activeTab) {
    case 'Events': return renderEvents();
    case 'Players': return renderPlayers();
    case 'Insights': return renderInsights();
    case 'Achievements': return renderAchievements();
    default: return renderDashboard();
  }
}

/* ---------- dashboard ---------- */

function buildRandomFacts(data, computed) {
  const facts = [];
  const playerName = (id) => computed.playersById[id]?.name || id;
  const games = data.games;
  const events = data.events;

  // 1. Biggest Hearts blowout
  {
    let best = null;
    games.filter((g) => g.gameType === 'hearts').forEach((g) => {
      const vals = Object.values(g.scores || {}).filter((v) => typeof v === 'number');
      if (vals.length < 3) return;
      const gap = Math.max(...vals) - Math.min(...vals);
      if (!best || gap > best.gap) best = { gap, game: g };
    });
    if (best) {
      const ev = events.find((e) => e.id === best.game.eventId);
      facts.push({
        icon: ICON.heart,
        title: 'Biggest Hearts blowout',
        body: `${best.gap} points separated the winner from last place on ${ev?.date || best.game.eventId}.`,
      });
    }
  }

  // 2. Photo finish (closest 1st/2nd in any scored game)
  {
    let best = null;
    games.forEach((g) => {
      const vals = Object.values(g.scores || {}).filter((v) => typeof v === 'number');
      if (vals.length < 2) return;
      const lower = SCORE_LOWER_IS_BETTER.has(g.gameType);
      const sorted = [...vals].sort((a, b) => lower ? a - b : b - a);
      const gap = Math.abs(sorted[0] - sorted[1]);
      if (!best || gap < best.gap) best = { gap, game: g };
    });
    if (best) {
      const ev = events.find((e) => e.id === best.game.eventId);
      const typeName = computed.gameTypesById[best.game.gameType]?.name || best.game.gameType;
      facts.push({
        icon: ICON.trend,
        title: 'Photo finish',
        body: `Only ${best.gap} point${best.gap === 1 ? '' : 's'} between 1st and 2nd in ${typeName} on ${ev?.date || ''}.`,
      });
    }
  }

  // 3. Marathon night
  {
    let best = null;
    events.forEach((e) => {
      const n = (e.games || []).length;
      if (!best || n > best.n) best = { n, ev: e };
    });
    if (best) facts.push({
      icon: ICON.flame,
      title: 'Marathon night',
      body: `${best.n} games were played on ${best.ev.date} — the busiest night on record.`,
    });
  }

  // 4. Busiest year
  {
    const byYear = {};
    events.forEach((e) => {
      const y = (e.date || '').slice(0, 4);
      if (y) byYear[y] = (byYear[y] || 0) + 1;
    });
    const top = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0];
    if (top) facts.push({
      icon: ICON.calendar,
      title: 'Peak season',
      body: `${top[0]} was the busiest year with ${top[1]} event${top[1] === 1 ? '' : 's'}.`,
    });
  }

  // 5. Always a bridesmaid (most 2nd-place finishes)
  {
    const seconds = {};
    events.forEach((e) => {
      (e.games || []).forEach((g) => {
        (g.results || []).forEach((r) => {
          if (Number(r.position) === 2) seconds[r.playerId] = (seconds[r.playerId] || 0) + 1;
        });
      });
    });
    const top = Object.entries(seconds).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) facts.push({
      icon: ICON.trophy,
      title: 'Always a bridesmaid',
      body: `${playerName(top[0])} has finished 2nd a league-leading ${top[1]} times.`,
    });
  }

  // 6. Heart of darkness (highest single Hearts score)
  {
    let worst = null;
    games.filter((g) => g.gameType === 'hearts').forEach((g) => {
      Object.entries(g.scores || {}).forEach(([pid, v]) => {
        if (typeof v !== 'number') return;
        if (!worst || v > worst.v) worst = { v, pid, game: g };
      });
    });
    if (worst) {
      const ev = events.find((e) => e.id === worst.game.eventId);
      facts.push({
        icon: ICON.heart,
        title: 'Heart of darkness',
        body: `${playerName(worst.pid)} took ${worst.v} points in a single Hearts game on ${ev?.date || ''}.`,
      });
    }
  }

  // 7. Mr. Consistency (smallest stdev in Hearts scores, min 5 games)
  {
    const byP = {};
    games.filter((g) => g.gameType === 'hearts').forEach((g) => {
      Object.entries(g.scores || {}).forEach(([pid, v]) => {
        if (typeof v !== 'number') return;
        (byP[pid] = byP[pid] || []).push(v);
      });
    });
    let best = null;
    Object.entries(byP).forEach(([pid, arr]) => {
      if (arr.length < 5) return;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const stdev = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
      if (!best || stdev < best.stdev) best = { stdev, mean, pid, n: arr.length };
    });
    if (best) facts.push({
      icon: ICON.trend,
      title: 'Mr. Consistency',
      body: `${playerName(best.pid)} averages ${best.mean.toFixed(1)} in Hearts with the lowest swing (±${best.stdev.toFixed(1)}) across ${best.n} games.`,
    });
  }

  // 8. Variety champion
  {
    const types = {};
    games.forEach((g) => {
      (g.players || []).forEach((pid) => {
        (types[pid] = types[pid] || new Set()).add(g.gameType);
      });
    });
    const top = Object.entries(types).map(([pid, s]) => [pid, s.size]).sort((a, b) => b[1] - a[1])[0];
    if (top) facts.push({
      icon: ICON.dice,
      title: 'Variety champion',
      body: `${playerName(top[0])} has played ${top[1]} different game types — more than anyone else.`,
    });
  }

  // 9. Most events attended
  {
    const attend = {};
    events.forEach((e) => {
      const seen = new Set();
      (e.games || []).forEach((g) => (g.results || []).forEach((r) => seen.add(r.playerId)));
      seen.forEach((pid) => attend[pid] = (attend[pid] || 0) + 1);
    });
    const top = Object.entries(attend).sort((a, b) => b[1] - a[1])[0];
    if (top) facts.push({
      icon: ICON.users,
      title: 'Iron seat',
      body: `${playerName(top[0])} has shown up to ${top[1]} of ${events.length} recorded game nights.`,
    });
  }

  // 10. Long-haul player
  {
    const veterans = data.players
      .filter((p) => p.active && Number.isFinite(Number(p.joinedYear)))
      .sort((a, b) => Number(a.joinedYear) - Number(b.joinedYear));
    if (veterans.length) {
      const v = veterans[0];
      facts.push({
        icon: ICON.trophy,
        title: 'Long-haul player',
        body: `${v.name} has been rolling dice with the crew since ${v.joinedYear}.`,
      });
    }
  }

  // 11. Longest dry spell
  {
    const dated = events.map((e) => new Date(e.date)).filter((d) => !isNaN(d)).sort((a, b) => a - b);
    let best = null;
    for (let i = 1; i < dated.length; i++) {
      const days = Math.round((dated[i] - dated[i - 1]) / 86400000);
      if (!best || days > best.days) best = { days, from: dated[i - 1], to: dated[i] };
    }
    if (best) {
      const fmt = (d) => d.toISOString().slice(0, 10);
      facts.push({
        icon: ICON.calendar,
        title: 'The long pause',
        body: `${best.days} days passed between ${fmt(best.from)} and ${fmt(best.to)} — the longest quiet stretch.`,
      });
    }
  }

  // 12. Grand total
  {
    facts.push({
      icon: ICON.table,
      title: 'By the numbers',
      body: `${games.length} games tracked across ${events.length} events and ${data.players.length} players.`,
    });
  }

  return facts;
}

function renderDashboard() {
  const { data, computed, isUnlocked, unlockError } = state;
  const summary = {
    eventCount: data.events.length,
    activePlayers: data.players.filter((p) => p.active).length,
    trophies: data.achievements.length,
    gameTypes: data.gameTypes.length,
  };
  const miniLeaders = computed.leaderboard.slice(0, 4);
  const maxWins = Math.max(...miniLeaders.map((e) => e.stats.wins), 1);
  const facts = buildRandomFacts(data, computed);
  const fact = facts.length ? facts[Math.floor(Math.random() * facts.length)] : null;

  const statCard = (label, value, detail, icon, tab) => `
    <article class="glass-card stat-card clickable" tabindex="0" role="button" data-action="tab" data-tab="${tab}" style="cursor:pointer">
      <div class="stat-icon-wrap">
        <div class="stat-icon">${icon}</div>
        ${ICON.chev}
      </div>
      <p class="muted small">${escapeHtml(label)}</p>
      <p class="stat-value">${escapeHtml(value)}</p>
      <p class="muted small">${escapeHtml(detail)}</p>
    </article>
  `;

  return `
    <section>
      <div class="hero-grid">
        <article class="hero-card">
          <div class="hero-season">Season 2026</div>
          <p class="hero-chip">${ICON.flame} Current champion: ${escapeHtml(computed.heroChampion)}</p>
          <h2>A living archive for every game night.</h2>
          <p>Track event dates, winners, player dossiers, trophies, and highlights from every game night.</p>
          <div class="hero-actions">
            <button type="button" data-action="tab" data-tab="Events">Browse events</button>
            <button type="button" class="secondary-btn" data-action="tab" data-tab="Players">View dossiers</button>
          </div>
        </article>
        ${fact ? `
          <article class="glass-card fact-card">
            <div class="fact-head">
              <div class="fact-icon">${fact.icon}</div>
              <p class="muted small">Did you know?</p>
            </div>
            <h3>${escapeHtml(fact.title)}</h3>
            <p>${escapeHtml(fact.body)}</p>
            <button type="button" class="secondary-btn fact-refresh" data-action="refresh-fact">Show another</button>
          </article>
        ` : ''}
      </div>

      <section class="stats-grid">
        ${statCard('Recorded events', String(summary.eventCount), 'Archived across all sessions', ICON.calendar, 'Events')}
        ${statCard('Active players', String(summary.activePlayers), 'Current core roster', ICON.users, 'Players')}
        ${statCard('Trophies awarded', String(summary.trophies), 'Virtual and seasonal', ICON.trophy, 'Achievements')}
        ${statCard('Games tracked', String(summary.gameTypes), 'Expandable rulesets', ICON.table, 'Events')}
      </section>

      <section class="leaders-grid">
        <article class="glass-card">
          <div class="row between">
            <div>
              <h3>Overall leaders</h3>
              <p class="muted small">Private details are hidden until unlocked.</p>
            </div>
            ${ICON.trend}
          </div>
          <div class="mini-bars">
            ${miniLeaders.map((entry, i) => `
              <div class="clickable" tabindex="0" role="button" data-action="select-player" data-player="${escapeHtml(entry.player.id)}" style="cursor:pointer">
                <div class="row between small-row">
                  <span class="small-title">${i + 1}. ${escapeHtml(entry.player.name)}</span>
                  <span class="muted small">${isUnlocked ? `${entry.stats.wins} wins` : 'Shared password required'}</span>
                </div>
                <div class="bar-track">
                  <div class="${cx('bar-fill', !isUnlocked && 'bar-fill-blur')}" style="width:${Math.max(8, (entry.stats.wins / maxWins) * 100)}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="glass-card">
          <h3>Game leaders</h3>
          <div class="game-leader-grid">
            ${computed.gameTypeLeaders.map((item) => `
              <div class="leader-item clickable" tabindex="0" role="button" data-action="filter-events" data-query="${escapeHtml(item.gameType)}" style="cursor:pointer">
                <div class="row gap-8">
                  <div class="mini-icon">${ICON.trophy}</div>
                  <div>
                    <p class="small-title">${escapeHtml(item.gameType)}</p>
                    <p class="muted tiny">${item.gamesPlayed} sessions</p>
                  </div>
                </div>
                <p class="muted small">Leader: <strong>${escapeHtml(item.leaderName)}</strong></p>
                <p class="${cx('small', !isUnlocked && 'blurred')}">${item.wins} wins</p>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    </section>
  `;
}

/* ---------- events ---------- */
function renderEvents() {
  const { data, computed, query } = state;
  const normalized = query.trim().toLowerCase();

  const filteredEvents = [...data.events]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .filter((event) => {
      if (!normalized) return true;
      const eventGames = computed.gamesByEventId[event.id] || [];
      const winners = eventGames.map((g) => computed.playersById[g.winner]?.name || g.winner).join(' ');
      const gameNames = eventGames.map((g) => computed.gameTypesById[g.gameType]?.name || g.gameType).join(' ');
      const hay = [event.title, event.location, event.recap, ...(event.highlights || []), gameNames, winners].join(' ').toLowerCase();
      return hay.includes(normalized);
    });

  return `
    <section>
      <div class="row between wrap-gap">
        <div>
          <h2 class="section-title">Event archive</h2>
          <p class="muted">Dates, locations, game winners, photos, recaps, and highlights.</p>
        </div>
        <div class="search-wrap">
          <span class="search-icon">${ICON.search}</span>
          <input data-action="search" value="${escapeHtml(query)}" placeholder="Search events, games, winners" aria-label="Search events" />
        </div>
      </div>

      <div class="event-grid">
        ${filteredEvents.map((event) => renderEventCard(event)).join('')}
      </div>
    </section>
  `;
}

function renderEventCard(event) {
  const { computed } = state;
  const recap = String(event.recap || '').replace(/^#\s*/gm, '').trim();
  const games = event.games || [];

  return `
    <article class="glass-card event-card">
      ${event.photo ? `<img src="${escapeHtml(event.photo)}" alt="${escapeHtml(event.title)}" class="event-photo" onerror="this.style.display='none'" />` : ''}
      <div class="event-body">
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        ${event.location ? `<p class="small event-location">${escapeHtml(event.location)}</p>` : ''}
        <p class="muted small event-recap">${escapeHtml(recap)}</p>

        <div class="stack">
          ${games.map((game, idx) => {
            const d = getGameDetails(game, computed);
            const href = buildGamePath(event.id, game.gameId, idx);
            return `
              <section class="highlight-box">
                <p class="small-title game-name">${escapeHtml(d.gameName)}</p>
                ${d.notes ? `<p class="muted small">${escapeHtml(d.notes)}</p>` : ''}
                <p class="small winner-line"><strong>Winner:</strong> ${winnerLine(d.winner, computed.playersById)}</p>
                <a class="results-link" href="${href}">Open full results</a>
              </section>
            `;
          }).join('')}
        </div>
      </div>
    </article>
  `;
}

/* ---------- players ---------- */
function renderPlayers() {
  const { data, computed, isUnlocked, selectedPlayerId } = state;
  if (!data.players.length) return `<p class="muted">No players.</p>`;
  const selected = data.players.find((p) => p.id === selectedPlayerId) || data.players[0];
  const stats = computed.statsByPlayer[selected.id] || { wins: 0, gamesPlayed: 0, winRate: 0 };

  return `
    <section class="players-grid">
      <article class="glass-card player-list-card">
        <h2 class="section-title">Player dossiers</h2>
        <label class="player-select-wrap">
          <span class="visually-hidden">Choose player</span>
          <select class="player-select" data-action="select-player-change">
            ${data.players.map((p) => `
              <option value="${escapeHtml(p.id)}" ${selected.id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}${p.nickname ? ` — ${escapeHtml(p.nickname)}` : ''}</option>
            `).join('')}
          </select>
        </label>
        <div class="player-list">
          ${data.players.map((p) => `
            <button type="button" class="${cx('player-list-item', selected.id === p.id && 'player-list-item-active')}" data-action="select-player" data-player="${escapeHtml(p.id)}">
              ${p.avatar
                ? `<img class="avatar-fallback" src="${escapeHtml(p.avatar)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar-fallback',textContent:'${escapeHtml(p.name.slice(0,1))}'}))" />`
                : `<div class="avatar-fallback">${escapeHtml(p.name.slice(0, 1))}</div>`}
              <div>
                <p class="small-title">${escapeHtml(p.name)}</p>
                <p class="muted tiny">${escapeHtml(p.nickname || '')}</p>
              </div>
            </button>
          `).join('')}
        </div>
      </article>

      ${selected.card ? `
        <div class="dossier-with-card">
          <figure class="player-card">
            <img class="player-card-img" src="${escapeHtml(selected.card)}" alt="${escapeHtml(selected.name)} player card" />
            <figcaption class="player-card-caption">
              <span class="muted tiny">Joined ${escapeHtml(String(computed.firstYearByPlayer[selected.id] || selected.joinedYear || ''))}</span>
            </figcaption>
          </figure>
          <article class="glass-card dossier-info-card">
            <div class="row between wrap-gap">
              <div>
                <p class="muted tiny upcase">Specialty</p>
                <p class="small-title">${escapeHtml(selected.specialty || '—')}</p>
              </div>
            </div>
            <p class="muted">${escapeHtml(selected.bio || '')}</p>
            <div class="dossier-stats-grid">
              <div class="chip-card">
                <p class="muted tiny">Wins</p>
                <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${stats.wins}</p>
              </div>
              <div class="chip-card">
                <p class="muted tiny">Games</p>
                <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${stats.gamesPlayed}</p>
              </div>
              <div class="chip-card">
                <p class="muted tiny">Win Rate</p>
                <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${(stats.winRate || 0).toFixed(1)}%</p>
              </div>
            </div>
            ${!isUnlocked ? `<p class="muted tiny">Unlock detailed stats from dashboard to reveal private records.</p>` : ''}
          </article>
        </div>
      ` : `
        <article class="glass-card dossier-card">
          <div class="dossier-hero">
            <div class="dossier-left">
              ${selected.avatar
                ? `<img class="avatar-large" src="${escapeHtml(selected.avatar)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar-large',textContent:'${escapeHtml(selected.name.slice(0,1))}'}))" />`
                : `<div class="avatar-large">${escapeHtml(selected.name.slice(0, 1))}</div>`}
              <p class="muted tiny">Joined ${escapeHtml(String(computed.firstYearByPlayer[selected.id] || selected.joinedYear || ''))}</p>
              <h3>${escapeHtml(selected.name)}</h3>
              <p class="accent">${escapeHtml(selected.nickname || '')}</p>
            </div>
            <div class="dossier-right">
              <div class="row between wrap-gap">
                <div>
                  <p class="muted tiny upcase">Specialty</p>
                  <p class="small-title">${escapeHtml(selected.specialty || '—')}</p>
                </div>
              </div>
              <p class="muted">${escapeHtml(selected.bio || '')}</p>
              <div class="dossier-stats-grid">
                <div class="chip-card">
                  <p class="muted tiny">Wins</p>
                  <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${stats.wins}</p>
                </div>
                <div class="chip-card">
                  <p class="muted tiny">Games</p>
                  <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${stats.gamesPlayed}</p>
                </div>
                <div class="chip-card">
                  <p class="muted tiny">Win Rate</p>
                  <p class="${cx('chip-value', !isUnlocked && 'blurred')}">${(stats.winRate || 0).toFixed(1)}%</p>
                </div>
              </div>
              ${!isUnlocked ? `<p class="muted tiny">Unlock detailed stats from dashboard to reveal private records.</p>` : ''}
            </div>
          </div>
        </article>
      `}
    </section>
  `;
}

/* ---------- achievements ---------- */
function renderAchievements() {
  const { data, computed } = state;
  if (!data.achievements.length) {
    return `
      <section>
        <h2 class="section-title">Achievements</h2>
        <p class="muted">Data-backed records only.</p>
        <article class="glass-card achievement-card">
          <h3>No achievements recorded yet</h3>
          <p class="muted small">No placeholder trophies are being shown.</p>
        </article>
      </section>
    `;
  }

  const sorted = [...data.achievements].sort((a, b) =>
    String(b.dateAwarded || '').localeCompare(String(a.dateAwarded || '')));

  return `
    <section>
      <h2 class="section-title">Achievements</h2>
      <p class="muted">Data-backed records only.</p>
      <div class="achievement-grid">
        ${sorted.map((a) => {
          const holders = (Array.isArray(a.holders) && a.holders.length ? a.holders : [a.holder])
            .filter(Boolean)
            .map((id) => computed.playersById[id]?.name || id);
          const achieved = computeAchievedDate(a, data.events) || a.dateAwarded || '';
          return `
            <article class="glass-card achievement-card">
              <div class="row between">
                <div class="achievement-icon">${iconForAchievement(a.name)}</div>
                <span class="muted tiny">${achieved ? `Achieved: ${escapeHtml(formatDate(achieved))}` : ''}</span>
              </div>
              <h3>${escapeHtml(a.name || '')}</h3>
              <div class="holder-list-wrap">
                <div class="holder-list">
                  ${holders.map((n) => `<span class="holder-pill">${escapeHtml(n)}</span>`).join('')}
                </div>
              </div>
              <p class="muted small">${escapeHtml(a.reason || '')}</p>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/* ---------- insights (charts) ---------- */
function renderInsights() {
  const { data, computed, insightGameType } = state;
  const filter = insightGameType || 'all';
  const filteredGames = filter === 'all' ? data.games : data.games.filter((g) => g.gameType === filter);

  // Per-player wins (filtered).
  const winsByPlayer = {};
  filteredGames.forEach((g) => { winsByPlayer[g.winner] = (winsByPlayer[g.winner] || 0) + 1; });
  const bars = data.players
    .map((p) => ({ player: p, wins: winsByPlayer[p.id] || 0 }))
    .filter((row) => row.wins > 0)
    .sort((a, b) => b.wins - a.wins);

  // Cumulative wins over time per player (filtered). Top 5 by total wins.
  const dateByEvent = Object.fromEntries(data.events.map((e) => [e.id, e.date]));
  const sortedGames = [...filteredGames]
    .map((g) => ({ ...g, date: dateByEvent[g.eventId] || '9999-12-31' }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const topIds = bars.slice(0, 5).map((b) => b.player.id);
  const cumulative = Object.fromEntries(topIds.map((id) => [id, []]));
  const tally = Object.fromEntries(topIds.map((id) => [id, 0]));
  const eventDates = [...new Set(sortedGames.map((g) => g.date))];
  eventDates.forEach((d) => {
    sortedGames.filter((g) => g.date === d).forEach((g) => {
      if (tally[g.winner] !== undefined) tally[g.winner] += 1;
    });
    topIds.forEach((id) => { cumulative[id].push({ date: d, value: tally[id] }); });
  });

  // Games-by-type bar (only when "all" is selected).
  const typeCounts = data.gameTypes.map((t) => ({
    type: t,
    count: data.games.filter((g) => g.gameType === t.id).length,
  })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count);

  const filterOptions = ['<option value="all">All games</option>',
    ...data.gameTypes.map((t) => `<option value="${escapeHtml(t.id)}"${filter === t.id ? ' selected' : ''}>${escapeHtml(t.name)}</option>`)
  ].join('');

  const filterLabel = filter === 'all' ? 'All games' : (computed.gameTypesById[filter]?.name || filter);

  // Average finish per player (from event results' positions). Respects filter and 3-game minimum.
  const placesByPlayer = {};
  data.events.forEach((ev) => {
    (ev.games || []).forEach((eg) => {
      if (filter !== 'all' && eg.gameId !== filter) return;
      (eg.results || []).forEach((r) => {
        const pid = r.playerId;
        const pos = r.position;
        if (!pid || typeof pos !== 'number') return;
        (placesByPlayer[pid] = placesByPlayer[pid] || []).push(pos);
      });
    });
  });
  const avgFinishRows = Object.entries(placesByPlayer)
    .filter(([, places]) => places.length >= 3)
    .map(([pid, places]) => ({
      pid,
      name: computed.playersById[pid]?.name || pid,
      avg: places.reduce((a, b) => a + b, 0) / places.length,
      n: places.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  return `
    <section>
      <div class="row between wrap-gap">
        <div>
          <h2 class="section-title">Insights</h2>
          <p class="muted">Wins by player and trends over time. Filter by game.</p>
        </div>
        <div class="search-wrap">
          <select data-action="insights-filter" aria-label="Filter by game">${filterOptions}</select>
        </div>
      </div>

      <div class="insights-grid">
        <article class="glass-card">
          <h3>Wins by player <span class="muted small">(${escapeHtml(filterLabel)})</span></h3>
          ${bars.length ? renderBarChart(bars.map((b) => ({ label: b.player.name, value: b.wins }))) : '<p class="muted small">No data.</p>'}
        </article>

        <article class="glass-card">
          <h3>Cumulative wins over time <span class="muted small">(top ${topIds.length} ${filter === 'all' ? 'overall' : 'in ' + escapeHtml(filterLabel)})</span></h3>
          ${topIds.length && eventDates.length
            ? renderLineChart(topIds.map((id, i) => ({
                label: computed.playersById[id]?.name || id,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
                points: cumulative[id],
              })), eventDates)
            : '<p class="muted small">No data.</p>'}
        </article>

        ${filter === 'all' && typeCounts.length ? `
          <article class="glass-card insights-wide">
            <h3>Games played by type</h3>
            ${renderBarChart(typeCounts.map((r) => ({ label: r.type.name, value: r.count })))}
          </article>
        ` : ''}

        ${avgFinishRows.length ? `
          <article class="glass-card insights-wide">
            <h3>Average finish <span class="muted small">(${escapeHtml(filterLabel)}, minimum 3 games) — lower is better</span></h3>
            <div class="table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th class="num">Avg finish</th>
                    <th class="num">Games</th>
                  </tr>
                </thead>
                <tbody>
                  ${avgFinishRows.map((r, i) => `
                    <tr>
                      <td class="num">${i + 1}</td>
                      <td>${escapeHtml(r.name)}</td>
                      <td class="num">${r.avg.toFixed(2)}</td>
                      <td class="num">${r.n}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </article>
        ` : ''}

        ${filter !== 'all' ? renderGameDeepStats(filter, filteredGames, sortedGames) : ''}
      </div>
    </section>
  `;
}

/* Score direction per game type. lower-is-better => penalty scoring (hearts). */
const SCORE_LOWER_IS_BETTER = new Set(['hearts', 'canadian-salad']);
// Game types whose per-result "score" is recorded for posterity but isn't
// comparable across events — suppress aggregate Avg/Best/Worst columns.
const SCORE_HIDDEN_AGGREGATE = new Set(['table-tennis']);

function gameTypeHasScores(games) {
  return games.some((g) => Object.values(g.scores || {}).some((v) => v !== 0));
}

function renderGameDeepStats(gameTypeId, filteredGames, sortedGames) {
  const { computed } = state;
  const typeName = computed.gameTypesById[gameTypeId]?.name || gameTypeId;
  const lowerBetter = SCORE_LOWER_IS_BETTER.has(gameTypeId);
  // Some game types (e.g. table tennis) have per-event scores that aren't
  // comparable across events — keep them in event detail views but hide
  // aggregate score columns and single-game extremes here.
  const hideAggregateScores = SCORE_HIDDEN_AGGREGATE.has(gameTypeId);
  const hasScores = !hideAggregateScores && gameTypeHasScores(filteredGames);

  // Per-player aggregate stats for this game type.
  const perPlayer = {};
  filteredGames.forEach((g) => {
    (g.players || []).forEach((pid) => {
      const row = perPlayer[pid] || (perPlayer[pid] = { played: 0, wins: 0, scores: [] });
      row.played += 1;
      if (g.winner === pid) row.wins += 1;
      const s = g.scores?.[pid];
      if (typeof s === 'number') row.scores.push(s);
    });
  });

  const statRows = Object.entries(perPlayer)
    .map(([pid, r]) => {
      const name = computed.playersById[pid]?.name || pid;
      const nonZero = r.scores.filter((v) => v !== 0);
      const scoreSample = hasScores ? r.scores : [];
      const avg = scoreSample.length ? scoreSample.reduce((a, b) => a + b, 0) / scoreSample.length : null;
      const best = scoreSample.length ? (lowerBetter ? Math.min(...scoreSample) : Math.max(...scoreSample)) : null;
      const worst = scoreSample.length ? (lowerBetter ? Math.max(...scoreSample) : Math.min(...scoreSample)) : null;
      return {
        pid, name,
        played: r.played,
        wins: r.wins,
        winPct: r.played ? (r.wins / r.played) * 100 : 0,
        avg, best, worst,
        hasNonZero: nonZero.length > 0,
      };
    })
    .filter((r) => r.played >= 1)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.avg == null && b.avg == null) return b.played - a.played;
      if (a.avg == null) return 1;
      if (b.avg == null) return -1;
      return lowerBetter ? a.avg - b.avg : b.avg - a.avg;
    });

  const fmt = (v) => v == null ? '—' : (Number.isInteger(v) ? v : v.toFixed(1));

  const table = `
    <div class="table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Player</th>
            <th class="num">Played</th>
            <th class="num">Wins</th>
            <th class="num">Win %</th>
            ${hasScores ? `<th class="num">Avg score</th><th class="num">Best</th><th class="num">Worst</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${statRows.map((r) => `
            <tr>
              <td>${escapeHtml(r.name)}</td>
              <td class="num">${r.played}</td>
              <td class="num">${r.wins}</td>
              <td class="num">${r.winPct.toFixed(0)}%</td>
              ${hasScores ? `
                <td class="num">${fmt(r.avg)}</td>
                <td class="num">${fmt(r.best)}</td>
                <td class="num">${fmt(r.worst)}</td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Place-per-event line chart for top players (by appearances). Always shown if positions exist.
  let placeTrend = '';
  {
    const topPlayers = statRows.map((r) => r.pid);
    const dateByEvent = Object.fromEntries(state.data.events.map((e) => [e.id, e.date]));
    // Collect (date, position) per player for this gameType from event results.
    const pointsByPlayer = Object.fromEntries(topPlayers.map((pid) => [pid, []]));
    state.data.events.forEach((ev) => {
      (ev.games || []).forEach((eg) => {
        if (eg.gameId !== gameTypeId) return;
        (eg.results || []).forEach((r) => {
          if (!topPlayers.includes(r.playerId)) return;
          if (typeof r.position !== 'number') return;
          pointsByPlayer[r.playerId].push({ date: ev.date, value: r.position });
        });
      });
    });
    const series = topPlayers.map((pid, i) => ({
      label: computed.playersById[pid]?.name || pid,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points: pointsByPlayer[pid].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    })).filter((s) => s.points.length > 0);

    if (series.length) {
      placeTrend = `
        <article class="glass-card insights-wide">
          <h3>${escapeHtml(typeName)} finish per event <span class="muted small">(lower is better; ${series.length} player${series.length === 1 ? '' : 's'}, click a name to isolate)</span></h3>
          ${renderLineChartDates(series, { invertY: true, integerTicks: true })}
        </article>
      `;
    }
  }

  // Single-game extremes panel.
  let extremes = '';
  if (hasScores) {
    const dateByEvent = Object.fromEntries(state.data.events.map((e) => [e.id, e.date]));
    const flat = filteredGames.flatMap((g) => Object.entries(g.scores || {}).map(([pid, v]) => ({
      pid, value: v, eventId: g.eventId, date: dateByEvent[g.eventId] || '',
    }))).filter((r) => r.value !== 0);
    if (flat.length) {
      const best = [...flat].sort((a, b) => lowerBetter ? a.value - b.value : b.value - a.value).slice(0, 5);
      const worst = [...flat].sort((a, b) => lowerBetter ? b.value - a.value : a.value - b.value).slice(0, 5);
      const li = (r) => `<li><strong>${escapeHtml(computed.playersById[r.pid]?.name || r.pid)}</strong> · ${r.value} <span class="muted small">${escapeHtml(r.date)}</span></li>`;
      extremes = `
        <article class="glass-card">
          <h3>Best single-game scores <span class="muted small">(${lowerBetter ? 'lowest' : 'highest'})</span></h3>
          <ul class="plain-list">${best.map(li).join('')}</ul>
        </article>
        <article class="glass-card">
          <h3>Worst single-game scores</h3>
          <ul class="plain-list">${worst.map(li).join('')}</ul>
        </article>
      `;
    }
  }

  return `
    <article class="glass-card insights-wide">
      <h3>${escapeHtml(typeName)} — per-player stats</h3>
      ${table}
    </article>
    ${placeTrend}
    ${extremes}
  `;
}

/* Line chart variant that uses real dates for x-spacing.
   Each series: { label, color, points: [{date, value}] } with possibly different dates. */
function renderLineChartDates(series, opts = {}) {
  const { invertY = false, integerTicks = false } = opts;
  const W = 640, H = 300, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 64;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const allDates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  if (!allDates.length) return '<p class="muted small">No data.</p>';
  const t0 = new Date(allDates[0]).getTime();
  const t1 = new Date(allDates[allDates.length - 1]).getTime();
  const span = Math.max(1, t1 - t0);
  const allVals = series.flatMap((s) => s.points.map((p) => p.value));
  const minY = invertY ? Math.min(1, ...allVals) : Math.min(0, ...allVals);
  const maxY = Math.max(invertY ? 1 : 1, ...allVals);
  const x = (d) => PAD_L + ((new Date(d).getTime() - t0) / span) * innerW;
  const y = (v) => invertY
    ? PAD_T + ((v - minY) / (maxY - minY || 1)) * innerH
    : PAD_T + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  const ticks = [];
  if (integerTicks) {
    for (let v = Math.ceil(minY); v <= Math.floor(maxY); v += 1) ticks.push(v);
  } else {
    const step = Math.max(1, Math.ceil((maxY - minY) / 5));
    for (let v = minY; v <= maxY; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY);
  }
  const grid = ticks.map((t) => `
    <line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(t)}" y2="${y(t)}" stroke="#e2e8f0" stroke-width="1" />
    <text x="${PAD_L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${t}</text>
  `).join('');

  // Collect all unique x positions across all series so we can place a date label per point on the axis.
  const xPositions = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))]
    .sort()
    .map((d) => ({ date: d, x: x(d) }));
  // Bump PAD_B for rotated date labels.
  const labelY = H - PAD_B + 14;
  const dateLabels = xPositions.map(({ date, x: cx }) => `
    <text x="${cx}" y="${labelY}" text-anchor="end" font-size="9" fill="#64748b"
          transform="rotate(-45 ${cx} ${labelY})">${escapeHtml(date.slice(5))}</text>
  `).join('');

  const lines = series.map((s, idx) => {
    const sid = `s${idx}`;
    const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
    const d = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date)} ${y(p.value)}`).join(' ');
    const dots = sorted.map((p) => `<circle cx="${x(p.date)}" cy="${y(p.value)}" r="3.5" fill="${s.color}"><title>${escapeHtml(s.label)} · ${escapeHtml(p.date)} · ${p.value}</title></circle>`).join('');
    return `<g class="chart-series" data-series-id="${sid}">
      <path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
    </g>`;
  }).join('');

  const legend = series.map((s, idx) => `
    <button type="button" class="chart-legend-item" data-action="chart-select-series" data-series-id="s${idx}">
      <span class="chart-legend-swatch" style="background:${s.color}"></span>${escapeHtml(s.label)}
    </button>
  `).join('');

  return `
    <div class="chart-line-wrap" data-chart-wrap>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Series over time">
        ${grid}
        ${lines}
        ${dateLabels}
      </svg>
      <div class="chart-legend">${legend}</div>
    </div>
  `;
}

const SERIES_COLORS = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4338ca', '#0d9488'];

function renderBarChart(rows) {
  if (!rows.length) return '<p class="muted small">No data.</p>';
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `
    <div class="chart-bars">
      ${rows.map((r) => `
        <div class="chart-bar-row">
          <span class="chart-bar-label">${escapeHtml(r.label)}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${(r.value / max) * 100}%"></div>
          </div>
          <span class="chart-bar-value">${r.value}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderLineChart(series, dates) {
  const W = 640, H = 260, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = dates.length;
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const x = (i) => PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => PAD_T + innerH - (v / maxY) * innerH;

  // y-axis ticks (0..maxY in up to 5 steps)
  const ticks = [];
  const step = Math.max(1, Math.ceil(maxY / 5));
  for (let v = 0; v <= maxY; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY);

  const grid = ticks.map((t) => `
    <line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(t)}" y2="${y(t)}" stroke="#e2e8f0" stroke-width="1" />
    <text x="${PAD_L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${t}</text>
  `).join('');

  const lines = series.map((s) => {
    const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
  }).join('');

  // X-axis: first, middle, last labels.
  const xLabels = [];
  if (n >= 1) xLabels.push({ i: 0, text: dates[0] });
  if (n >= 3) xLabels.push({ i: Math.floor((n - 1) / 2), text: dates[Math.floor((n - 1) / 2)] });
  if (n >= 2) xLabels.push({ i: n - 1, text: dates[n - 1] });
  const xTicks = xLabels.map((l) => `
    <text x="${x(l.i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#94a3b8">${escapeHtml(l.text)}</text>
  `).join('');

  const legend = series.map((s) => `
    <span class="chart-legend-item"><span class="chart-legend-swatch" style="background:${s.color}"></span>${escapeHtml(s.label)}</span>
  `).join('');

  return `
    <div class="chart-line-wrap">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative wins line chart">
        ${grid}
        ${lines}
        ${xTicks}
      </svg>
      <div class="chart-legend">${legend}</div>
    </div>
  `;
}

/* ---------- results page ---------- */
function renderResultsPage() {
  const { data, computed, selectedGameRoute } = state;
  const event = data.events.find((e) => e.id === selectedGameRoute.eventId);
  if (!event) return notFound();
  const eventGame = event.games?.[selectedGameRoute.gameIndex]?.gameId === selectedGameRoute.gameId
    ? event.games[selectedGameRoute.gameIndex]
    : event.games?.find((g) => g.gameId === selectedGameRoute.gameId);
  if (!eventGame) return notFound();

  const d = getGameDetails(eventGame, computed);

  const head = `
    <button type="button" class="back-link" data-action="back-to-events">${ICON.back} Back to events</button>
    <article class="glass-card results-hero-card">
      <p class="muted tiny upcase">Game results</p>
      <h2 class="section-title">${escapeHtml(d.gameName)}</h2>
      <p class="muted">${escapeHtml(event.title)} · ${escapeHtml(formatDate(event.date))}${event.location ? ` · ${escapeHtml(event.location)}` : ''}</p>
      <p class="small winner-line"><strong>Winner:</strong> ${winnerLine(d.winner, computed.playersById)}</p>
      ${d.notes ? `<p class="muted small">${escapeHtml(d.notes)}</p>` : ''}
    </article>
  `;

  const headerCells = [
    '<th>Player</th>',
    d.hasPosition  ? '<th>Place</th>'    : '',
    d.hasGamesWon  ? '<th>Games</th>'    : '',
    d.hasSeriesWon ? '<th>Series</th>'   : '',
    d.hasPoints    ? '<th>Points</th>'   : '',
    d.hasWinnings  ? '<th>Winnings</th>' : '',
  ].join('');

  const bodyRows = d.results.map((r) => `
    <tr>
      <td>${escapeHtml(r.playerName)}</td>
      ${d.hasPosition  ? `<td>${Number.isFinite(Number(r.position)) ? `#${r.position}` : '—'}</td>` : ''}
      ${d.hasGamesWon  ? `<td>${Number.isFinite(Number(r.gamesWon))  ? r.gamesWon  : '—'}</td>` : ''}
      ${d.hasSeriesWon ? `<td>${Number.isFinite(Number(r.seriesWon)) ? r.seriesWon : '—'}</td>` : ''}
      ${d.hasPoints    ? `<td>${Number.isFinite(Number(r.points))    ? r.points    : '—'}</td>` : ''}
      ${d.hasWinnings  ? `<td>${Number.isFinite(Number(r.winnings))  ? `$${r.winnings}` : '—'}</td>` : ''}
    </tr>
  `).join('');

  const finals = `
    <article class="glass-card results-section-card">
      <h3>Final results</h3>
      <div class="game-results-table standalone-results-table">
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </article>
  `;

  let rounds = '';
  if (d.rounds.length) {
    const headers = ['<th>Round</th>', ...d.results.map((r) => `<th>${escapeHtml(r.playerName)}</th>`)].join('');
    const rows = d.rounds.map((round, i) => {
      const byId = Object.fromEntries((round.values || []).map((v) => [v.playerId, v.value]));
      const cells = d.results.map((r) => {
        const v = byId[r.playerId];
        return `<td>${v !== '' && v !== undefined ? escapeHtml(String(v)) : '—'}</td>`;
      }).join('');
      return `<tr><td>${escapeHtml(formatRoundLabel(round, i))}</td>${cells}</tr>`;
    }).join('');
    rounds = `
      <article class="glass-card results-section-card">
        <h3>Round breakdown</h3>
        <div class="game-results-table standalone-results-table">
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }

  return `<section class="results-page stack">${head}${finals}${rounds}</section>`;
}

function notFound() {
  return `
    <section class="results-page stack">
      <button type="button" class="back-link" data-action="back-to-events">${ICON.back} Back to events</button>
      <article class="glass-card"><h3>Game not found</h3><p class="muted small">The link may be stale.</p></article>
    </section>
  `;
}

/* ---------- event delegation ---------- */
function clearGameHash() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  state.selectedGameRoute = null;
}

function onClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'tab': {
      clearGameHash();
      state.activeTab = target.dataset.tab || 'Dashboard';
      render(); break;
    }
    case 'select-player': {
      state.selectedPlayerId = target.dataset.player || null;
      clearGameHash();
      state.activeTab = 'Players';
      render(); break;
    }
    case 'filter-events': {
      state.query = target.dataset.query || '';
      clearGameHash();
      state.activeTab = 'Events';
      render(); break;
    }
    case 'lock': {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      state.isUnlocked = false;
      render(); break;
    }
    case 'back-to-events': {
      clearGameHash();
      state.activeTab = 'Events';
      render(); break;
    }
    case 'retry': {
      bootstrap(true); break;
    }
    case 'refresh-fact': {
      render(); break;
    }
    case 'chart-select-series': {
      const wrap = target.closest('[data-chart-wrap]');
      if (!wrap) break;
      const sid = target.dataset.seriesId;
      const current = wrap.getAttribute('data-selected-series');
      const clearActive = () => {
        wrap.querySelectorAll('.chart-series').forEach((el) => el.classList.remove('is-active'));
        wrap.querySelectorAll('.chart-legend-item').forEach((el) => el.classList.remove('is-selected'));
      };
      if (current === sid) {
        wrap.removeAttribute('data-selected-series');
        clearActive();
      } else {
        wrap.setAttribute('data-selected-series', sid);
        clearActive();
        wrap.querySelector(`.chart-series[data-series-id="${sid}"]`)?.classList.add('is-active');
        target.classList.add('is-selected');
      }
      break;
    }
  }
}

function onSubmit(e) {
  const form = e.target.closest('[data-action="unlock-form"]');
  if (!form) return;
  e.preventDefault();
  const password = form.querySelector('input[name="password"]').value;
  if (password === SHARED_PASSWORD) {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    state.isUnlocked = true;
    state.unlockError = '';
  } else {
    state.unlockError = 'Incorrect password';
  }
  render();
}

function onInput(e) {
  const target = e.target.closest('[data-action="search"]');
  if (!target) return;
  state.query = target.value;
  // Preserve focus & caret across re-render: only rerender event grid.
  const grid = document.querySelector('.event-grid');
  if (grid) {
    const { data, computed } = state;
    const normalized = state.query.trim().toLowerCase();
    const filtered = [...data.events]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .filter((event) => {
        if (!normalized) return true;
        const eg = computed.gamesByEventId[event.id] || [];
        const winners = eg.map((g) => computed.playersById[g.winner]?.name || g.winner).join(' ');
        const gameNames = eg.map((g) => computed.gameTypesById[g.gameType]?.name || g.gameType).join(' ');
        const hay = [event.title, event.location, event.recap, ...(event.highlights || []), gameNames, winners].join(' ').toLowerCase();
        return hay.includes(normalized);
      });
    grid.innerHTML = filtered.map((ev) => renderEventCard(ev)).join('');
  }
}

function onChange(e) {
  const insights = e.target.closest('[data-action="insights-filter"]');
  if (insights) {
    state.insightGameType = insights.value;
    render();
    return;
  }
  const playerSel = e.target.closest('[data-action="select-player-change"]');
  if (playerSel) {
    state.selectedPlayerId = playerSel.value || null;
    render();
    return;
  }
}

function onHashChange() {
  const route = parseGamePath(window.location.hash);
  state.selectedGameRoute = route;
  if (route) {
    state.activeTab = 'Events';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  render();
}

/* ---------- bootstrap ---------- */
async function bootstrap(force = false) {
  state.loading = true; state.error = null; render();
  try {
    const data = await loadAllData();
    state.data = data;
    state.computed = compute(data);
    state.selectedGameRoute = parseGamePath(window.location.hash);
    if (state.selectedGameRoute) state.activeTab = 'Events';
    state.loading = false;
    render();
  } catch (err) {
    state.loading = false;
    state.error = (err && err.message) || String(err);
    render();
  }
}

document.addEventListener('click', onClick);
document.addEventListener('submit', onSubmit);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
window.addEventListener('hashchange', onHashChange);
bootstrap();
