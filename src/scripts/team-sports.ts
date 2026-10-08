import type { Match } from '../data/types';
import type { StandingRow } from '../data/first-team';
import { matchCard, renderResults, renderStandings, sorted } from './public-sports';
import { getTeamCompetition } from '../data/team-competitions';
import { competitionMatch } from '../lib/sports-teams';

type Snapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; source?: 'initial' };
const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');

async function refreshTeam(panel: HTMLElement) {
  if (!api) return;
  const teamId = panel.dataset.teamSports;
  const competition = getTeamCompetition(teamId || '');
  if (!competition) return;
  try {
    const response = await fetch(`${api}/api/sports?team=${encodeURIComponent(teamId || '')}`, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`Sports API: ${response.status}`);
    const snapshot = await response.json() as Snapshot;
    if (!Array.isArray(snapshot.matches) || !Array.isArray(snapshot.standings) || !snapshot.updatedAt) throw new Error('Respuesta deportiva incompleta.');
    const { upcoming, results } = sorted(snapshot.matches.map(match => competitionMatch(match, competition.id)));
    const upcomingTarget = panel.querySelector('[data-team-upcoming]');
    if (upcomingTarget) upcomingTarget.replaceChildren(...(upcoming.length ? upcoming.slice(0, 2).map(match => matchCard(match)) : [empty('Aún no hay próximos partidos publicados.')]));
    renderResults(panel.querySelector('[data-team-results]'), results.slice(0, 4));
    const allUpcoming = panel.querySelector('[data-team-all-upcoming]');
    if (allUpcoming) allUpcoming.replaceChildren(...(upcoming.length ? upcoming.map(match => matchCard(match)) : [empty('Aún no hay próximos partidos publicados.')]));
    renderResults(panel.querySelector('[data-team-all-results]'), results);
    renderStandings(panel.querySelector('[data-team-standings]'), snapshot.standings);
    const updated = panel.querySelector('[data-team-updated]');
    if (updated) updated.textContent = snapshot.source === 'initial' ? 'última copia verificada del 4 de octubre de 2026' : new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(snapshot.updatedAt));
  } catch (cause) {
    if (teamId !== 'primer-equipo') {
      const upcoming = panel.querySelector('[data-team-upcoming]');
      if (upcoming) upcoming.replaceChildren(empty('Partidos temporalmente no disponibles. Consulta los resultados oficiales.'));
      const results = panel.querySelector('[data-team-results]');
      if (results) results.replaceChildren(empty('Resultados temporalmente no disponibles.'));
      panel.querySelector('[data-team-all-upcoming]')?.replaceChildren(empty('Partidos temporalmente no disponibles. Consulta los resultados oficiales.'));
      panel.querySelector('[data-team-all-results]')?.replaceChildren(empty('Resultados temporalmente no disponibles.'));
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

for (const panel of document.querySelectorAll<HTMLElement>('[data-team-sports]')) {
  const dialog = panel.querySelector<HTMLDialogElement>('[data-team-dialog]');
  const triggers = panel.querySelectorAll<HTMLButtonElement>('[data-team-more]');
  if (!dialog || !triggers.length) continue;
  let activeTrigger: HTMLButtonElement | undefined;
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      activeTrigger = trigger;
      const section = trigger.dataset.teamMore;
      const title = dialog.querySelector('[data-team-dialog-title]');
      if (title) title.textContent = section === 'upcoming' ? 'Próximos partidos' : 'Todos los resultados';
      for (const content of dialog.querySelectorAll<HTMLElement>('[data-team-dialog-section]')) {
        content.hidden = content.dataset.teamDialogSection !== section;
      }
      dialog.showModal();
      dialog.querySelector('.team-matches-dialog__body')?.scrollTo(0, 0);
    });
  }
  panel.querySelector('[data-team-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => activeTrigger?.focus({ preventScroll: true }));
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
}

void Promise.all([...document.querySelectorAll<HTMLElement>('[data-team-sports]')].map(refreshTeam));
