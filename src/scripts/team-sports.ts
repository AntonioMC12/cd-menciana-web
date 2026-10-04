import type { Match } from '../data/types';
import type { StandingRow } from '../data/first-team';
import { matchCard, renderResults, renderStandings, sorted } from './public-sports';

type Snapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; source?: 'initial' };
const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');

async function refreshTeam(panel: HTMLElement) {
  if (!api) return;
  const teamId = panel.dataset.teamSports;
  try {
    const response = await fetch(`${api}/api/sports?team=${encodeURIComponent(teamId || '')}`, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`Sports API: ${response.status}`);
    const snapshot = await response.json() as Snapshot;
    if (!Array.isArray(snapshot.matches) || !Array.isArray(snapshot.standings) || !snapshot.updatedAt) throw new Error('Respuesta deportiva incompleta.');
    const { upcoming, results } = sorted(snapshot.matches);
    const upcomingTarget = panel.querySelector('[data-team-upcoming]');
    if (upcomingTarget) upcomingTarget.replaceChildren(...(upcoming.length ? upcoming.map(match => matchCard(match)) : [empty('Aún no hay próximos partidos publicados.')]));
    renderResults(panel.querySelector('[data-team-results]'), results);
    renderStandings(panel.querySelector('[data-team-standings]'), snapshot.standings);
    const updated = panel.querySelector('[data-team-updated]');
    if (updated) updated.textContent = snapshot.source === 'initial' ? 'última copia verificada del 4 de octubre de 2026' : new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(snapshot.updatedAt));
  } catch (cause) {
    if (teamId !== 'primer-equipo') {
      const upcoming = panel.querySelector('[data-team-upcoming]');
      if (upcoming) upcoming.replaceChildren(empty('Partidos temporalmente no disponibles. Consulta los resultados oficiales.'));
      const results = panel.querySelector('[data-team-results]');
      if (results) results.replaceChildren(empty('Resultados temporalmente no disponibles.'));
      const standings = panel.querySelector('[data-team-standings]');
      if (standings) standings.replaceChildren(tableNotice('Clasificación temporalmente no disponible.'));
      const updated = panel.querySelector('[data-team-updated]');
      if (updated) updated.textContent = 'actualización pendiente';
    }
    console.warn(`No se pudo actualizar ${teamId}.`, cause);
  }
}

function empty(message: string) {
  const element = document.createElement('p');
  element.className = 'empty-panel';
  element.textContent = message;
  return element;
}

function tableNotice(message: string) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 9;
  cell.textContent = message;
  row.append(cell);
  return row;
}

void Promise.all([...document.querySelectorAll<HTMLElement>('[data-team-sports]')].map(refreshTeam));
