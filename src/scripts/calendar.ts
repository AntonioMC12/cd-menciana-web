import type { Match } from '../data/types';
import { getTeamCrest } from '../data/team-crests';
import { createSvgIcon } from '../lib/icons';
import { firstTeamMatches, firstTeamSource } from '../data/first-team';
import { competitiveTeamIds, teamCompetitions, rfafCalendarUrl, type CompetitiveTeamId } from '../data/team-competitions';
import { renderStandings } from './public-sports';
import type { StandingRow } from '../data/first-team';
import { competitionMatch, isClubTeam } from '../lib/sports-teams';
import seasonCalendars from '../data/season-calendars.json';
import { mergeSeasonMatches } from '../lib/season-calendar';

type Selection = CompetitiveTeamId | 'all';
type Entry = { teamId: CompetitiveTeamId; match: Match };
type Snapshot = { updatedAt: string; matches: Match[]; standings: StandingRow[]; source?: 'initial' };
const root = document.querySelector<HTMLElement>('[data-calendar]');
if (root) {
  const find = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const categoryTrigger = find<HTMLButtonElement>('[data-category-trigger]');
  const categoryMenu = find<HTMLElement>('[data-category-menu]');
  const categoryBackdrop = find<HTMLElement>('[data-category-backdrop]');
  const status = find<HTMLElement>('[data-calendar-status]');
  const next = find<HTMLElement>('[data-calendar-next]');
  const content = find<HTMLElement>('[data-calendar-content]');
  const dialog = find<HTMLDialogElement>('[data-match-dialog]');
  const dialogContent = find<HTMLElement>('[data-dialog-content]');
  const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const params = new URLSearchParams(location.search);
  const validCategory = (value: string | null): value is Selection => value === 'all' || competitiveTeamIds.includes(value as CompetitiveTeamId);
  const validMonth = (value: string | null) => Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const store = new Map<CompetitiveTeamId, Match[]>(competitiveTeamIds.map(id => [id, id === 'primer-equipo' ? firstTeamMatches : seasonCalendars[id].matches as Match[]]));
  const updated = new Map<CompetitiveTeamId, string>();
  const unavailable = new Set<CompetitiveTeamId>();
  let category: Selection = validCategory(params.get('categoria')) ? params.get('categoria') as Selection : 'primer-equipo';
  let month = validMonth(params.get('mes')) ? params.get('mes')! : today.slice(0, 7);
  let view: 'grid' | 'list' = params.get('vista') === 'lista' || (!params.has('vista') && matchMedia('(max-width: 900px)').matches) ? 'list' : 'grid';
  let openedFrom: HTMLElement | null = null;
  let requestToken = 0;

  const node = (tag: string, className = '', text?: string) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const madridDate = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-ES', { ...options, timeZone: 'Europe/Madrid' }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
  const fullDate = (value?: string) => value ? madridDate(value, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha por confirmar';
  const time = (value?: string) => value?.includes('T') ? `${value.slice(11, 16)} h` : 'Hora pendiente';
  const stateLabel = (match: Match) => match.status === 'finished' ? 'Finalizado' : match.status === 'postponed' ? 'Aplazado' : match.dateIsRound ? 'Fecha de jornada' : match.date?.includes('T') ? 'Próximo' : 'Horario pendiente';
  const isHome = (match: Match) => isClubTeam(match.homeTeam);
  const clubSide = (match: Match) => isHome(match) ? 'En casa' : isClubTeam(match.awayTeam) ? 'Fuera de casa' : 'Sede por confirmar';
  const labelFor = (id: Selection) => id === 'all' ? 'Todas las categorías' : teamCompetitions[id].label;
  const entryKey = ({ teamId, match }: Entry) => `${teamId}:${match.id}`;
  const entries = () => (category === 'all' ? competitiveTeamIds : [category]).flatMap(teamId => (store.get(teamId) || []).map(match => ({ teamId, match })));
  const sortedEntries = (items: Entry[]) => [...items].sort((a, b) => (a.match.date || '9999').localeCompare(b.match.date || '9999') || a.teamId.localeCompare(b.teamId));
  const link = (source: string) => source.startsWith('https://stars.rfaf.es/storage/novanet/') ? source : `${base}${source}`;
  const crest = (name: string, logo?: string) => {
    logo = getTeamCrest(name) || logo;
    if (isClubTeam(name) || logo) {
      const img = node('img', 'calendar-crest') as HTMLImageElement;
      img.src = link(isClubTeam(name) ? '/images/escudo-oficial.svg' : logo!);
      img.alt = '';
      img.width = 48; img.height = 48; img.loading = 'lazy';
      return img;
    }
    const fallback = node('span', 'calendar-crest calendar-crest--fallback', name.charAt(0));
    fallback.setAttribute('aria-hidden', 'true');
    return fallback;
  };
  const teams = (match: Match) => {
    const wrap = node('div', 'calendar-teams');
    for (const [name, logo] of [[match.homeTeam, match.homeLogo], [match.awayTeam, match.awayLogo]] as const) {
      const side = node('div', 'calendar-teams__side');
      side.append(crest(name, logo), node('strong', '', name));
      wrap.append(side);
    }
    return wrap;
  };
  const scoreText = (match: Match) => match.status === 'finished' && match.homeScore !== undefined && match.awayScore !== undefined
    ? `${match.homeScore} : ${match.awayScore}` : time(match.date);
  const matchButton = (entry: Entry, compact = false) => {
    const { match, teamId } = entry;
    const button = node('button', `calendar-match ${compact ? 'calendar-match--compact' : ''} calendar-match--${match.status}`) as HTMLButtonElement;
    button.type = 'button'; button.dataset.matchKey = entryKey(entry);
    button.dataset.team = teamId;
    button.dataset.location = isHome(match) ? 'home' : isClubTeam(match.awayTeam) ? 'away' : 'unknown';
    button.setAttribute('aria-label', `${labelFor(teamId)}. ${clubSide(match)}: ${match.homeTeam} contra ${match.awayTeam}. ${fullDate(match.date)}. ${stateLabel(match)}. ${scoreText(match)}. Ver detalles`);
    const top = node('span', 'calendar-match__top');
    const categoryBadge = node('span', 'calendar-match__category', teamId === 'infantil' ? 'Infantil' : labelFor(teamId));
    categoryBadge.title = labelFor(teamId);
    top.append(categoryBadge, node('span', 'calendar-location', button.dataset.location === 'home' ? 'Casa' : button.dataset.location === 'away' ? 'Fuera' : 'Sede pendiente'));
    button.append(top);
    button.append(node('span', 'calendar-match__state', stateLabel(match)));
    if (compact) {
      button.append(node('span', 'calendar-match__mini', `${match.homeTeam} · ${match.awayTeam}`), node('strong', 'calendar-match__score', scoreText(match)));
    } else {
      button.append(teams(match));
      const meta = node('span', 'calendar-match__meta');
      meta.append(node('span', '', `${clubSide(match)} · ${match.round || 'Jornada pendiente'}`), node('strong', '', scoreText(match)));
      button.append(meta, node('span', 'calendar-match__venue', `${match.competition} · ${match.venue || 'Pabellón por confirmar'}`));
    }
    return button;
  };
  const empty = (message: string) => {
    const panel = node('div', 'calendar-empty');
    panel.append(node('span', 'calendar-empty__mark', '—'), node('h3', '', 'Sin encuentros para mostrar'), node('p', '', message));
    const change = node('button', 'calendar-empty__change', 'Cambiar categoría') as HTMLButtonElement;
    change.type = 'button'; change.addEventListener('click', () => openMenu());
    panel.append(change);
    return panel;
  };
  const monthItems = () => sortedEntries(entries().filter(({ match }) => match.date?.startsWith(month)));
  const renderNext = () => {
    const upcoming = sortedEntries(entries().filter(({ match }) => match.status === 'scheduled' && (!match.date || match.date.slice(0, 10) >= today)))[0];
    next.replaceChildren();
    if (!upcoming) {
      const panel = node('div', 'calendar-next__empty');
      panel.append(node('span', 'pill', 'PRÓXIMO PARTIDO'), node('p', '', 'Todavía no hay un próximo partido publicado para esta selección.'));
      next.append(panel);
      return;
    }
    const { match, teamId } = upcoming;
    const card = node('article', 'calendar-feature');
    const intro = node('div', 'calendar-feature__intro');
    intro.append(node('span', 'pill pill--blue', 'PRÓXIMO PARTIDO'), node('p', '', `${labelFor(teamId)} · ${match.competition}`), node('h2', '', `${fullDate(match.date)} · ${time(match.date)}`));
    const info = node('p', '', `${clubSide(match)} · ${match.venue || 'Pabellón por confirmar'}`);
    intro.append(info);
    if (match.dateIsRound) intro.append(node('p', '', 'Fecha general de la jornada. Día y hora del partido por confirmar.'));
    card.append(intro, teams(match));
    const detail = node('button', 'calendar-feature__detail', 'Ver detalles ') as HTMLButtonElement;
    detail.append(createSvgIcon());
    detail.type = 'button'; detail.dataset.matchKey = entryKey(upcoming);
    card.append(detail); next.append(card);
  };
  const renderList = (items: Entry[]) => {
    const list = node('div', 'calendar-agenda');
    const grouped = new Map<string, Entry[]>();
    for (const entry of items) {
      const key = entry.match.date?.slice(0, 10) || 'pending';
      grouped.set(key, [...(grouped.get(key) || []), entry]);
    }
    for (const [date, group] of grouped) {
      const section = node('section', 'calendar-agenda__day');
      section.append(node('h3', '', date === 'pending' ? 'Fecha pendiente' : fullDate(date)));
      const cards = node('div', 'calendar-agenda__cards');
      cards.append(...group.map(entry => matchButton(entry)));
      section.append(cards); list.append(section);
    }
    return list;
  };
  const renderGrid = (items: Entry[]) => {
    const grid = node('div', 'calendar-grid');
    for (const day of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) grid.append(node('div', 'calendar-grid__weekday', day));
    const [year, monthNumber] = month.split('-').map(Number);
    const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    for (let i = 0; i < offset; i++) grid.append(node('div', 'calendar-grid__blank'));
    for (let day = 1; day <= length; day++) {
      const key = `${month}-${String(day).padStart(2, '0')}`;
      const cell = node('div', `calendar-grid__day${key === today ? ' calendar-grid__day--today' : ''}`);
      cell.append(node('span', 'calendar-grid__number', String(day)));
      for (const entry of items.filter(({ match }) => match.date?.slice(0, 10) === key)) cell.append(matchButton(entry, true));
      grid.append(cell);
    }
    return grid;
  };
  const setUrl = () => {
    const url = new URL(location.href);
    url.searchParams.set('categoria', category);
    url.searchParams.set('mes', month);
    url.searchParams.set('vista', view === 'grid' ? 'calendario' : 'lista');
    history.replaceState(null, '', url);
  };
  const render = () => {
    root.dataset.calendarCategory = category;
    find('[data-category-label]').textContent = labelFor(category);
    find('[data-month-label]').textContent = madridDate(`${month}-15`, { month: 'long', year: 'numeric' });
    document.querySelectorAll<HTMLButtonElement>('[data-category-option]').forEach(option => {
      option.setAttribute('aria-current', String(option.dataset.categoryOption === category));
    });
    const effectiveView = matchMedia('(max-width: 900px)').matches ? 'list' : view;
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === effectiveView)));
    const items = monthItems();
    find('[data-calendar-count]').textContent = `${items.length} ${items.length === 1 ? 'partido' : 'partidos'} en este mes`;
    renderNext();
    const lacking = (category === 'all' ? competitiveTeamIds : [category]).filter(id => unavailable.has(id));
    status.textContent = lacking.length ? `No se han podido cargar los datos de ${lacking.map(labelFor).join(', ')}. Se muestran los partidos disponibles.` : '';
    const hasAny = entries().length > 0;
    content.replaceChildren(items.length ? (effectiveView === 'grid' ? renderGrid(items) : renderList(items)) :
      empty(hasAny ? 'No hay partidos publicados para este mes. Puedes navegar a otro mes o cambiar de categoría.' : 'Aún no hay partidos publicados para esta categoría. Prueba otra selección.'));
    const selected = category === 'all' ? 'primer-equipo' : category;
    const stamp = updated.get(selected);
    find('[data-calendar-updated]').textContent = stamp ? `Actualizados ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(stamp))}` : `Calendario verificado el ${firstTeamSource.checkedOn}`;
    (find<HTMLAnchorElement>('[data-calendar-source]')).href = rfafCalendarUrl(teamCompetitions[selected]);
    setUrl();
  };
  const closeMenu = (focus = false) => {
    categoryMenu.hidden = true; categoryBackdrop.hidden = true;
    categoryTrigger.setAttribute('aria-expanded', 'false');
    if (focus) categoryTrigger.focus();
  };
  const openMenu = () => {
    categoryMenu.hidden = false; categoryBackdrop.hidden = false;
    categoryTrigger.setAttribute('aria-expanded', 'true');
    categoryMenu.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
  };
  categoryTrigger.addEventListener('click', () => categoryMenu.hidden ? openMenu() : closeMenu());
  categoryBackdrop.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !categoryMenu.hidden) closeMenu(true);
    if (!categoryMenu.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key) && document.activeElement?.hasAttribute('data-category-option')) {
      event.preventDefault();
      const options = [...categoryMenu.querySelectorAll<HTMLButtonElement>('[data-category-option]')];
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
    }
  });
  document.addEventListener('click', event => {
    if (!categoryMenu.hidden && !event.composedPath().includes(categoryTrigger) && !event.composedPath().includes(categoryMenu) && !event.composedPath().includes(categoryBackdrop)) closeMenu();
  });
  categoryMenu.querySelectorAll<HTMLButtonElement>('[data-category-option]').forEach(option => option.addEventListener('click', () => {
    category = option.dataset.categoryOption as Selection;
    closeMenu(true); render(); void load(category);
  }));
  const shiftMonth = (offset: number) => {
    const [year, number] = month.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, number - 1 + offset, 1));
    month = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    render();
  };
  find('[data-month-prev]').addEventListener('click', () => shiftMonth(-1));
  find('[data-month-next]').addEventListener('click', () => shiftMonth(1));
  find('[data-month-today]').addEventListener('click', () => { month = today.slice(0, 7); render(); });
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view as 'grid' | 'list'; render();
  }));
  window.addEventListener('resize', () => render());
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-match-key]');
    if (!button) return;
    const entry = entries().find(item => entryKey(item) === button.dataset.matchKey);
    if (!entry) return;
    openedFrom = button;
    const { match, teamId } = entry;
    const heading = node('h2', '', `${match.homeTeam} — ${match.awayTeam}`);
    heading.id = 'calendar-dialog-title';
    const detail = node('div', 'calendar-dialog__body');
    detail.append(heading, teams(match));
    const description = node('dl');
    for (const [label, value] of [
      ['Categoría', labelFor(teamId)], ['Estado', stateLabel(match)], ['Condición', clubSide(match)],
      [match.dateIsRound ? 'Fecha de jornada (día del partido por confirmar)' : 'Fecha', fullDate(match.date)], ['Hora', time(match.date)], ['Competición', match.competition],
      ['Jornada', match.round || 'Pendiente'], ['Pabellón', match.venue || 'Por confirmar'],
      ...(match.status === 'finished' ? [['Resultado', scoreText(match)]] : []),
    ]) {
      const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); description.append(row);
    }
    detail.append(description); dialogContent.replaceChildren(detail); dialog.showModal();
  });
  find('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => openedFrom?.focus());

  async function load(selection: Selection) {
    if (!api) {
      for (const id of (selection === 'all' ? competitiveTeamIds : [selection])) if (id !== 'primer-equipo') unavailable.add(id);
      render(); return;
    }
    const token = ++requestToken;
    const ids = selection === 'all' ? competitiveTeamIds : [selection];
    const missing = ids.filter(id => !updated.has(id));
    if (!missing.length) return;
    status.textContent = 'Actualizando partidos…';
    const results = await Promise.allSettled(missing.map(async id => {
      const response = await fetch(`${api}/api/sports?team=${encodeURIComponent(id)}`, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error(`Sports API: ${response.status}`);
      const snapshot = await response.json() as Snapshot;
      if (!Array.isArray(snapshot.matches) || !snapshot.updatedAt) throw new Error('Respuesta deportiva incompleta');
      return { id, snapshot };
    }));
    results.forEach((result, index) => {
      const id = missing[index];
      if (result.status === 'fulfilled') {
        store.set(id, mergeSeasonMatches(seasonCalendars[id].matches as Match[], result.value.snapshot.matches).map(match => competitionMatch(match, id)));
        updated.set(id, result.value.snapshot.updatedAt);
        unavailable.delete(id);
        if (id === 'primer-equipo' && Array.isArray(result.value.snapshot.standings)) renderStandings(document.querySelector('[data-sports-standings]'), result.value.snapshot.standings);
      } else unavailable.add(id);
    });
    if (token === requestToken) render();
  }
  render();
  void load(category);
  window.addEventListener('popstate', () => {
    const incoming = new URLSearchParams(location.search);
    category = validCategory(incoming.get('categoria')) ? incoming.get('categoria') as Selection : 'primer-equipo';
    month = validMonth(incoming.get('mes')) ? incoming.get('mes')! : today.slice(0, 7);
    view = incoming.get('vista') === 'lista' ? 'list' : 'grid';
    render(); void load(category);
  });
}
