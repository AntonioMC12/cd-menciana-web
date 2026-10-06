import { bindings } from '../src/lib/cms';
import { firstTeamMatches, firstTeamStandings, type StandingRow } from '../src/data/first-team';
import { teamCrests } from '../src/data/team-crests';
import { rfafWidgetUrl, teamCompetitions, type CompetitiveTeamId, type TeamCompetition } from '../src/data/team-competitions';
import type { Match } from '../src/data/types';
import { competitionMatch } from '../src/lib/sports-teams';

export type SportsSnapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; roundsChecked?: number; source?: 'initial' };
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
const normalized = (name: string) => name.replace(/&#0?39;|&apos;/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const knownTeams = new Map(firstTeamStandings.map(row => [normalized(row.team), row.team]));
const isClub = (name: string, team: TeamCompetition) => normalized(name).includes(normalized(team.teamNeedle));
const displayName = (name: string, team: TeamCompetition) => {
  if (isClub(name, team)) {
    return team.officialName;
  }
  return knownTeams.get(normalized(name)) || name;
};
const snapshotKey = (teamId: CompetitiveTeamId) => teamId === 'primer-equipo' ? 'first-team-2026-27' : `${teamId}-2026-27`;
const crestFor = (teamId: CompetitiveTeamId, name: string) => teamCrests[teamId]?.[normalized(name)];
const withTeamCrests = (snapshot: SportsSnapshot, teamId: CompetitiveTeamId): SportsSnapshot => ({
  ...snapshot,
  matches: snapshot.matches.filter(match => normalized(match.homeTeam) !== 'descansa' && normalized(match.awayTeam) !== 'descansa').map(match => ({
    ...competitionMatch(match, teamId),
    homeLogo: match.homeLogo || crestFor(teamId, match.homeTeam),
    awayLogo: match.awayLogo || crestFor(teamId, match.awayTeam),
  })),
});

export function parseStandings(html: string, teamId: CompetitiveTeamId = 'primer-equipo'): StandingRow[] {
  const team = teamCompetitions[teamId];
  const table = html.match(/<table class="novanet-classification-table[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
  if (!table) throw new Error('La clasificación RFAF no está disponible.');
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(cell => plain(cell[1]));
    if (cells.length < 10) throw new Error('Formato de clasificación RFAF desconocido.');
    const numbers = [1, 3, 4, 5, 6, 7, 8, 9].map(index => Number(cells[index]));
    if (numbers.some(value => !Number.isInteger(value) || value < 0)) throw new Error('Estadísticas RFAF inválidas.');
    const [position, points, played, won, drawn, lost, goalsFor, goalsAgainst] = numbers;
    const club = isClub(cells[2], team);
    const name = displayName(cells[2], team);
    return { position, team: name, points, played, won, drawn, lost, goalsFor, goalsAgainst, ...(club ? { isClub: true, ...(teamId === 'primer-equipo' ? { isFirstTeam: true } : {}) } : {}) };
  });
  if (rows.length < (teamId === 'primer-equipo' ? 10 : 4) || rows.filter(row => row.isClub).length !== 1 || new Set(rows.map(row => row.position)).size !== rows.length) throw new Error('Clasificación RFAF incompleta.');
  return rows;
}

export function parseTeamMatch(html: string, round: number, teamId: CompetitiveTeamId = 'primer-equipo'): Match | null {
  const team = teamCompetitions[teamId];
  if (!html.includes('novanet-match-row')) {
    if (html.includes('No hay partidos publicados para esta jornada')) return null;
    throw new Error(`Jornada ${round}: resultados RFAF no disponibles.`);
  }
  const articles = [...html.matchAll(/<article class="novanet-match-row[^>]*>([\s\S]*?)<\/article>/g)];
  const card = articles.find(([, content]) => isClub(plain(content), team));
  if (!card) return null;
  const teams = [...card[1].matchAll(/<span class="min-w-0 truncate[^>]*>([\s\S]*?)<\/span>/g)].map(match => displayName(plain(match[1]), team));
  if (teams.some(name => normalized(name) === 'descansa')) return null;
  const score = plain(card[1].match(/<div class="novanet-score-value[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
  const info = (label: string) => plain(card[1].match(new RegExp(`<span class="font-semibold text-slate-900">${label}:<\\/span>\\s*([^<]*)`))?.[1] || '');
  const dateText = info('Fecha');
  const dateMatch = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const time = info('Hora');
  const result = score.match(/^(\d+)\s*-\s*(\d+)$/);
  if (teams.length !== 2 || teams.filter(name => isClub(name, team)).length !== 1 || !dateMatch || !info('Estado')) throw new Error(`Jornada ${round}: ficha RFAF incompleta.`);
  const [, day, month, year] = dateMatch;
  const date = `${year}-${month}-${day}${/^\d{2}:\d{2}$/.test(time) ? `T${time}:00` : ''}`;
  const status = result ? 'finished' : 'scheduled';
  const old = teamId === 'primer-equipo' ? firstTeamMatches.find(match => match.id === `2026-27-j${round}`) : undefined;
  const images = [...card[1].matchAll(/<img\b[^>]*\bsrc="(https:\/\/stars\.rfaf\.es\/storage\/novanet\/[\w.-]+\.(?:jpg|jpeg|png|webp))"[^>]*\balt="([^"]+)"/g)]
    .map(([, url, alt]) => ({ url, name: plain(alt) }));
  const logoFor = (name: string) => crestFor(teamId, name) || images.find(image => normalized(image.name) === normalized(name))?.url;
  return {
    id: teamId === 'primer-equipo' ? `2026-27-j${round}` : `2026-27-${teamId}-j${round}`, competition: team.category, round: `Jornada ${round}`,
    homeTeam: teams[0], awayTeam: teams[1],
    ...(old?.homeLogo || logoFor(teams[0]) ? { homeLogo: old?.homeLogo || logoFor(teams[0]) } : {}),
    ...(old?.awayLogo || logoFor(teams[1]) ? { awayLogo: old?.awayLogo || logoFor(teams[1]) } : {}),
    date, venue: info('Lugar') || undefined, status, publication: 'confirmed',
    ...(result ? { homeScore: Number(result[1]), awayScore: Number(result[2]) } : {}),
  };
}

async function fetchRfaf(url: string): Promise<string> {
  const response = await fetch(url, { headers: { accept: 'text/html', 'user-agent': 'CDMencianaWeb/1.0 (+https://cdmenciana.es/)' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`RFAF respondió ${response.status}.`);
  const html = await response.text();
  if (html.length < 2000 || html.length > 2_000_000) throw new Error('Respuesta RFAF inválida.');
  return html;
}

export async function syncSports(teamId: CompetitiveTeamId = 'primer-equipo'): Promise<SportsSnapshot> {
  const team = teamCompetitions[teamId];
  const standings = parseStandings(await fetchRfaf(rfafWidgetUrl(team, 'classification')), teamId);
  // Check the whole season, including future rounds with no published matches yet.
  const finalRound = team.rounds;
  const matches: Match[] = [];
  for (let first = 1; first <= finalRound; first += 4) {
    const rounds = Array.from({ length: Math.min(4, finalRound - first + 1) }, (_, index) => first + index);
    const pages = await Promise.all(rounds.map(round => fetchRfaf(`${rfafWidgetUrl(team, 'results')}&jornada=${round}`)));
    for (let index = 0; index < rounds.length; index++) {
      const match = parseTeamMatch(pages[index], rounds[index], teamId);
      if (match) matches.push(match);
    }
  }
  const clubPlayed = standings.find(row => row.isClub)?.played ?? 0;
  if (matches.length < (teamId === 'primer-equipo' ? 3 : 1) || matches.filter(match => match.status === 'finished').length < clubPlayed) throw new Error('Calendario RFAF incompleto.');
  const snapshot = withTeamCrests({ updatedAt: new Date().toISOString(), matches, standings, roundsChecked: finalRound }, teamId);
  await bindings().DB.prepare('INSERT INTO sports_snapshots (key, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at').bind(snapshotKey(teamId), JSON.stringify(snapshot), snapshot.updatedAt).run();
  return snapshot;
}

export async function getSportsSnapshot(teamId: CompetitiveTeamId = 'primer-equipo'): Promise<SportsSnapshot | null> {
  const row = await bindings().DB.prepare('SELECT payload_json FROM sports_snapshots WHERE key=?').bind(snapshotKey(teamId)).first<{ payload_json: string }>();
  return row ? withTeamCrests(JSON.parse(row.payload_json) as SportsSnapshot, teamId) : null;
}
