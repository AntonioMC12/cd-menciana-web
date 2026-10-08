import type { Match } from '../data/types';
import type { StandingRow } from '../data/first-team';
import { teamCompetitions } from '../data/team-competitions';
import { getTeamCrest } from '../data/team-crests';
import { competitionMatch, isClubTeam } from '../lib/sports-teams';

type Snapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; source?: 'initial' };
const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const element = (tag: string, className = '', content?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
};
const date = (value: string, style: 'full' | 'medium') => new Intl.DateTimeFormat('es-ES', { dateStyle: style, timeZone: 'Europe/Madrid' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const crest = (team: string, logo?: string, result = false) => {
  logo = getTeamCrest(team) || logo;
  if (isClubTeam(team) || logo) {
    const image = element('img', result ? 'result-card__crest' : 'team-crest') as HTMLImageElement;
    const source = isClubTeam(team) ? '/images/escudo-oficial.svg' : logo || '';
    image.src = source.startsWith('https://stars.rfaf.es/storage/novanet/') ? source : `${base}${source}`;
    image.alt = '';
    image.width = result ? 38 : 65;
    image.height = result ? 38 : 65;
    image.loading = 'lazy';
    return image;
  }
  return result ? null : element('span', 'team-initial team-initial--muted', team.charAt(0));
};
export const matchCard = (match?: Match, first = false) => {
  const card = element('article', `match-card${first ? ' match-card--prominent' : ''}`);
  if (first) card.id = 'proximo-partido';
  const top = element('div', 'match-card__top');
  top.append(element('span', 'pill pill--blue', first ? 'Próximo partido' : 'Próxima jornada'), element('span', '', match?.round || 'Por confirmar'));
  const teams = element('div', 'match-card__teams');
  for (const [index, name, logo] of [[0, match?.homeTeam || teamCompetitions['primer-equipo'].officialName, match?.homeLogo], [1, match?.awayTeam || 'Rival por confirmar', match?.awayLogo]] as const) {
    if (index === 1) teams.append(element('span', 'versus', 'VS'));
    const side = element('div');
    const image = crest(name, logo);
    if (image) side.append(image);
    side.append(element('strong', '', name));
    teams.append(side);
  }
  const bottom = element('div', 'match-card__bottom');
  const time = match?.dateIsRound ? ' · fecha de jornada; día y hora por confirmar' : match?.date?.includes('T') ? ` · ${match.date.slice(11, 16)}` : ' · hora pendiente';
  bottom.append(element('span', '', match?.date ? `${date(match.date, 'full')}${time}` : 'Fecha y hora pendientes'), element('span', '', match?.venue || 'Sede por confirmar'));
  card.append(top, teams, bottom);
  return card;
};
const resultCard = (match: Match) => {
  const card = element('article', 'result-card');
  const detail = element('div', 'result-card__detail');
  detail.append(element('span', 'result-card__label', `${match.round || match.competition}${match.date ? ` · ${date(match.date, 'medium')}` : ''}`));
  const teams = element('div', 'result-card__teams');
  for (const [index, name, logo] of [[0, match.homeTeam, match.homeLogo], [1, match.awayTeam, match.awayLogo]] as const) {
    if (index === 1) teams.append(element('span', 'result-card__separator', '—'));
    const heading = element('h3');
    const image = crest(name, logo, true);
    if (image) heading.append(image);
    heading.append(element('span', '', name));
    teams.append(heading);
  }
  detail.append(teams);
  const score = element('div', 'result-card__score');
  score.setAttribute('aria-label', `Resultado ${match.homeScore} a ${match.awayScore}`);
  score.append(String(match.homeScore), element('span', '', ' : '), String(match.awayScore));
  card.append(detail, score);
  return card;
};
export const sorted = (matches: Match[]) => ({
  upcoming: matches.filter(match => match.status === 'scheduled').sort((a, b) => (a.date || '').localeCompare(b.date || '')),
  results: matches.filter(match => match.status === 'finished').sort((a, b) => (b.date || '').localeCompare(a.date || '')),
});
export const renderResults = (target: Element | null, matches: Match[]) => {
  if (!target) return;
  if (!matches.length) { target.replaceChildren(element('p', 'empty-panel', 'Aún no hay resultados publicados.')); return; }
  const list = element('div', 'results-list');
  list.append(...matches.map(resultCard));
  target.replaceChildren(list);
};
export const renderStandings = (target: Element | null, rows: StandingRow[]) => {
  if (!target) return;
  target.replaceChildren(...rows.map(row => {
    const ours = row.isClub || row.isFirstTeam;
    const tr = element('tr', ours ? 'standings-table__ours' : '');
    const position = element('th', '', String(row.position)); position.setAttribute('scope', 'row');
    const team = element('td', '', row.team);
    if (ours) team.append(element('span', 'standings-table__tag', 'Nuestro equipo'));
    const points = element('td'); points.append(element('strong', '', String(row.points)));
    tr.append(position, team, points, ...[row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst].map(value => element('td', '', String(value))));
    return tr;
  }));
};
async function refresh() {
  if (!api) return;
  try {
    const response = await fetch(`${api}/api/sports`, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`Sports API: ${response.status}`);
    const snapshot = await response.json() as Snapshot;
    if (!Array.isArray(snapshot.matches) || !Array.isArray(snapshot.standings) || !snapshot.updatedAt) throw new Error('Respuesta deportiva incompleta.');
    const { upcoming, results } = sorted(snapshot.matches.map(match => competitionMatch(match, 'primer-equipo')));
    const homeNext = document.querySelector('[data-sports-home-next]');
    if (homeNext) homeNext.replaceChildren(matchCard(upcoming[0], true));
    renderResults(document.querySelector('[data-sports-home-results]'), results.slice(0, 3));
    const list = document.querySelector('[data-sports-upcoming]');
    if (list) list.replaceChildren(...(upcoming.length ? upcoming.map((match, index) => matchCard(match, index === 0)) : [matchCard(undefined, true)]));
    renderResults(document.querySelector('[data-sports-results]'), results);
    renderStandings(document.querySelector('[data-sports-standings]'), snapshot.standings);
    const updated = document.querySelector('[data-sports-updated]');
    if (updated) updated.textContent = snapshot.source === 'initial' ? 'el 4 de octubre de 2026 (última copia verificada)' : new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(snapshot.updatedAt));
    if (location.hash === '#proximo-partido' && list) document.getElementById('proximo-partido')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (cause) { console.warn('Se conserva la última información deportiva publicada.', cause); }
}
if (document.querySelector('[data-sports-home-next], [data-sports-upcoming]')) void refresh();
