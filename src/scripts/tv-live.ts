import { fetchTv } from '../lib/tv-client';
import type { TvVideo } from '../lib/youtube';
const marks = [...document.querySelectorAll<HTMLElement>('[data-cdm-tv-mark]')];
const homeLive = document.querySelector<HTMLElement>('[data-home-live]');
function updateLive(video?: Pick<TvVideo, 'title'>) {
  setLive(!!video);
  if (!homeLive) return;
  const title = homeLive.querySelector<HTMLElement>('[data-home-live-title]')!;
  const nextTitle = video?.title || '';
  if (title.textContent !== nextTitle) title.textContent = nextTitle;
  homeLive.hidden = !video;
}
function setLive(active: boolean) {
  marks.forEach(mark => {
    mark.dataset.live = String(active);
    const label = mark.querySelector<HTMLElement>('[data-live-label]');
    if (label) label.hidden = !active;
    mark.closest('a')?.setAttribute('aria-label', active ? 'CDM TV: en directo' : 'CDM TV');
  });
}
// Explicit local design preview, never compiled into production behavior.
const preview = import.meta.env.DEV && new URLSearchParams(location.search).get('preview-cdm-live') === '1';
const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');
if (preview) {
  updateLive({ title: 'CD Menciana · Partido en directo' });
  const label = homeLive?.querySelector<HTMLElement>('[data-home-live-preview]');
  if (label) label.hidden = false;
} else if ((marks.length || homeLive) && api) {
  let pending = false;
  async function refresh(force = false) {
    if (pending) return;
    pending = true;
    try {
      const { ok, data } = await fetchTv(api, force);
      const live = ok && data.status === 'ready' ? data.videos.filter(video => video.state === 'live') : [];
      updateLive(live.find(video => video.id === data.featured?.id) || live[0]);
    } catch { updateLive(); }
    finally { pending = false; }
  }
  void refresh();
  if (homeLive) {
    // Check while the home page is visible, including when the visitor returns.
    window.setInterval(() => { if (!document.hidden) void refresh(true); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(true); });
  }
}
