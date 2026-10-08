import { fetchTv } from '../lib/tv-client';
const marks = [...document.querySelectorAll<HTMLElement>('[data-cdm-tv-mark]')];
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
if (preview) setLive(true);
else if (marks.length && api) {
  void fetchTv(api).then(({ ok, data }) => setLive(ok && data.status === 'ready' && data.videos.some(video => video.state === 'live'))).catch(() => setLive(false));
}
