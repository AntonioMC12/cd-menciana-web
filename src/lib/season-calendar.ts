import type { Match } from '../data/types';
import { teamCompetitions, type CompetitiveTeamId } from '../data/team-competitions';
const text = (s: string) => s.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/clubdeportivo/g, 'cd');

export function parseSeasonCalendar(html: string, teamId: CompetitiveTeamId): Match[] {
  const team = teamCompetitions[teamId];
  if (!/Temporada\s+2026\s*[-–]\s*2027/.test(text(html))) throw new Error('Temporada RFAF incorrecta o calendario no disponible.');
  const matches: Match[] = [];
  const seen = new Set<number>();
  for (const [, table] of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const header = text(table.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1] || '');
    const match = header.match(/Jornada\s+(\d+)\s*\((\d{2})-(\d{2})-(\d{4})\)/);
    if (!match) continue;
    const [, round, day, month, year] = match;
    const number = Number(round);
    if (seen.has(number) || number < 1 || number > team.rounds) throw new Error('Jornadas RFAF inválidas.');
    seen.add(number);
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => text(cell)));
    const ours = rows.filter(cells => cells.length === 3 && [cells[0], cells[2]].some(name => normal(name).includes(normal(team.teamNeedle))));
    if (ours.length !== 1) throw new Error(`Jornada ${round}: no se encuentra un único encuentro del club.`);
    const [homeTeam, , awayTeam] = ours[0];
    if ([homeTeam, awayTeam].some(name => normal(name) === 'descansa')) continue;
    const date = `${year}-${month}-${day}`;
    if (new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Fecha de jornada RFAF inválida.');
    matches.push({ id: teamId === 'primer-equipo' ? `2026-27-j${round}` : `2026-27-${teamId}-j${round}`, competition: team.category, round: `Jornada ${round}`, homeTeam, awayTeam, date, dateIsRound: true, status: 'scheduled', publication: 'provisional' });
  }
  if (seen.size !== team.rounds || !matches.length) throw new Error('Calendario de temporada RFAF incompleto.');
  return matches;
}

export function mergeSeasonMatches(calendar: Match[], details: Match[]): Match[] {
  return calendar.map(match => {
    const detail = details.find(item => item.id === match.id && normal(item.homeTeam) === normal(match.homeTeam) && normal(item.awayTeam) === normal(match.awayTeam));
    if (!detail) return match;
    return { ...match, ...detail, dateIsRound: detail.dateIsRound ?? false };
  });
}
