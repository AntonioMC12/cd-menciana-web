const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-team-link]')];
const panels = [...document.querySelectorAll<HTMLElement>('[data-team-panel]')];

function selectTeam() {
  const requested = decodeURIComponent(location.hash.slice(1));
  const selected = panels.some(panel => panel.dataset.teamPanel === requested) ? requested : 'primer-equipo';
  for (const link of links) {
    if (link.dataset.teamLink === selected) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  for (const panel of panels) panel.hidden = panel.dataset.teamPanel !== selected;
  if (requested === selected) requestAnimationFrame(() => document.getElementById(selected)?.scrollIntoView({ block: 'start' }));
}

selectTeam();
window.addEventListener('hashchange', selectTeam);
