import { bindings } from '../src/lib/cms';
import { firstTeamMatches, firstTeamSource, firstTeamStandings, type StandingRow } from '../src/data/first-team';
import type { Match } from '../src/data/types';

export type SportsSnapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; source?: 'initial' };
const teamPattern = /APAGA Y VAMONOS RAVI OBRAS|APAGA Y VÁMONOS RAVI OBRAS/i;
const competition = '3.ª División F.S. · Grupo 17';
const base = firstTeamSource.resultsUrl;
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
const normalized = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const knownTeams = new Map(firstTeamStandings.map(row => [normalized(row.team), row.team]));
const displayName = (name: string) => teamPattern.test(name) ? 'CD Menciana' : knownTeams.get(normalized(name)) || name;

export function parseStandings(html: string): StandingRow[] {
  const table = html.match(/<table class="novanet-classification-table[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
  if (!table) throw new Error('La clasificación RFAF no está disponible.');
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(cell => plain(cell[1]));
    if (cells.length < 10) throw new Error('Formato de clasificación RFAF desconocido.');
    const numbers = [1, 3, 4, 5, 6, 7, 8, 9].map(index => Number(cells[index]));
    if (numbers.some(value => !Number.isInteger(value) || value < 0)) throw new Error('Estadísticas RFAF inválidas.');
    const [position, points, played, won, drawn, lost, goalsFor, goalsAgainst] = numbers;
    const team = displayName(cells[2]);
    return { position, team, points, played, won, drawn, lost, goalsFor, goalsAgainst, ...(team === 'CD Menciana' ? { isFirstTeam: true } : {}) };
  });
  if (rows.length < 10 || rows.filter(row => row.isFirstTeam).length !== 1 || new Set(rows.map(row => row.position)).size !== rows.length) throw new Error('Clasificación RFAF incompleta.');
  return rows;
}

export function parseTeamMatch(html: string, round: number): Match | null {
  if (!html.includes('novanet-match-row')) {
    if (html.includes('No hay partidos publicados para esta jornada')) return null;
    throw new Error(`Jornada ${round}: resultados RFAF no disponibles.`);
  }
  const articles = [...html.matchAll(/<article class="novanet-match-row[^>]*>([\s\S]*?)<\/article>/g)];
  const card = articles.find(([, content]) => teamPattern.test(content));
  if (!card) return null;
  const teams = [...card[1].matchAll(/<span class="min-w-0 truncate[^>]*>([\s\S]*?)<\/span>/g)].map(match => displayName(plain(match[1])));
  const score = plain(card[1].match(/<div class="novanet-score-value[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
  const info = (label: string) => plain(card[1].match(new RegExp(`<span class="font-semibold text-slate-900">${label}:<\\/span>\\s*([^<]*)`))?.[1] || '');
  const dateText = info('Fecha');
  const dateMatch = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const time = info('Hora');
  const result = score.match(/^(\d+)\s*-\s*(\d+)$/);
  if (teams.length !== 2 || teams.filter(team => team === 'CD Menciana').length !== 1 || !dateMatch || !info('Estado')) throw new Error(`Jornada ${round}: ficha RFAF incompleta.`);
  const [, day, month, year] = dateMatch;
  const date = `${year}-${month}-${day}${/^\d{2}:\d{2}$/.test(time) ? `T${time}:00` : ''}`;
  const status = result ? 'finished' : 'scheduled';
  const old = firstTeamMatches.find(match => match.id === `2026-27-j${round}`);
  return {
    id: `2026-27-j${round}`, competition, round: `Jornada ${round}`,
    homeTeam: teams[0], awayTeam: teams[1],
    ...(old?.homeLogo ? { homeLogo: old.homeLogo } : {}), ...(old?.awayLogo ? { awayLogo: old.awayLogo } : {}),
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

export async function syncSports(): Promise<SportsSnapshot> {
  const standings = parseStandings(await fetchRfaf(firstTeamSource.standingsUrl));
  const played = Math.max(...standings.map(row => row.played));
  const finalRound = Math.min(30, Math.max(7, played + 4));
  const matches: Match[] = [];
  for (let first = 1; first <= finalRound; first += 4) {
    const rounds = Array.from({ length: Math.min(4, finalRound - first + 1) }, (_, index) => first + index);
    const pages = await Promise.all(rounds.map(round => fetchRfaf(`${base}&jornada=${round}`)));
    for (let index = 0; index < rounds.length; index++) {
      const match = parseTeamMatch(pages[index], rounds[index]);
      if (match) matches.push(match);
    }
  }
  if (matches.length < 3 || matches.filter(match => match.status === 'finished').length < Math.min(played, 3)) throw new Error('Calendario RFAF incompleto.');
  const snapshot = { updatedAt: new Date().toISOString(), matches, standings };
  await bindings().DB.prepare('INSERT INTO sports_snapshots (key, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at').bind('first-team-2026-27', JSON.stringify(snapshot), snapshot.updatedAt).run();
  return snapshot;
}

export async function getSportsSnapshot(): Promise<SportsSnapshot | null> {
  const row = await bindings().DB.prepare('SELECT payload_json FROM sports_snapshots WHERE key=?').bind('first-team-2026-27').first<{ payload_json: string }>();
  return row ? JSON.parse(row.payload_json) as SportsSnapshot : null;
}
