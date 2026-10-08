import { videoIdPattern, videoUrl, type TvVideo } from '../lib/youtube';
import { fetchTv } from '../lib/tv-client';
const root = document.querySelector<HTMLElement>('[data-tv]');
if (root) {
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const dialog = find<HTMLDialogElement>('[data-player]');
  const status = find('[data-status]');
  const retry = find<HTMLButtonElement>('[data-retry]');
  const frame = find('[data-player-frame]');
  const consent = find('[data-consent]');
  let selected: TvVideo | undefined;
  let opener: HTMLElement | null = null;
  let library: TvVideo[] = [];
  let activeFilter = 'all';
  const labels = { live: 'EN DIRECTO', upcoming: 'Próxima retransmisión', completed: 'Retransmisión finalizada', video: 'Vídeo' };
  const date = (value: string, timed = false) => Number.isNaN(Date.parse(value)) ? '' : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', ...(timed ? { timeStyle: 'short', timeZone: 'Europe/Madrid' } : { timeZone: 'Europe/Madrid' }) }).format(new Date(value));
  function open(video: TvVideo, trigger: HTMLElement) {
    selected = video; opener = trigger; frame.replaceChildren(); consent.hidden = !video.embeddable;
    find('#tv-player-title').textContent = video.title;
    find<HTMLAnchorElement>('[data-player-youtube]').href = videoUrl(video.id);
    dialog.showModal();
  }
  find('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { frame.replaceChildren(); selected = undefined; opener?.focus(); });
  find('[data-load]').addEventListener('click', () => {
    if (!selected || !videoIdPattern.test(selected.id)) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${selected.id}?autoplay=0`;
    iframe.title = selected.title; iframe.allow = 'encrypted-media; picture-in-picture; fullscreen'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(iframe); consent.hidden = true; iframe.focus();
  });
  function playButton(video: TvVideo, eager = false) {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `${video.embeddable ? 'Abrir reproductor' : 'Ver opciones de reproducción'}: ${video.title}`);
    const img = document.createElement('img'); img.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`; img.alt = ''; img.width = 480; img.height = 270; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
    const icon = document.createElement('span'); icon.className = 'tv-play'; icon.setAttribute('aria-hidden', 'true');
    button.append(img, icon); button.addEventListener('click', () => open(video, button)); return button;
  }
  function card(video: TvVideo) {
    const article = document.createElement('article'); article.className = 'tv-card';
    const copy = document.createElement('div'); copy.className = 'tv-card-copy';
    const badge = document.createElement('span'); badge.className = `tv-badge tv-badge--${video.state}`; badge.textContent = labels[video.state];
    const title = document.createElement('h3'); title.textContent = video.title;
    const time = document.createElement('time'); const value = video.state === 'upcoming' ? video.scheduledAt : video.publishedAt; if (value) { time.dateTime = value; time.textContent = date(value, video.state === 'upcoming'); }
    const link = document.createElement('a'); link.href = videoUrl(video.id); link.textContent = 'Ver en YouTube ↗'; link.className = 'text-link'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    copy.append(badge, title, time, link); article.append(playButton(video), copy); return article;
  }
  function renderLibrary() {
    const videos = library.filter(video => activeFilter === 'all' || video.state === activeFilter);
    find('[data-videos]').replaceChildren(...videos.map(card));
    find('[data-videos-empty]').hidden = videos.length > 0;
    find('[data-videos-empty]').textContent = library.length ? 'No hay contenidos de este tipo en los últimos vídeos del canal.' : 'Los próximos contenidos del canal aparecerán aquí.';
    find('[data-video-count]').textContent = videos.length ? `${videos.length} ${videos.length === 1 ? 'contenido' : 'contenidos'}` : '';
    root!.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
  }
  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all'; renderLibrary();
  }));
  async function load(refresh = false) {
    if (!root!.dataset.api) { status.textContent = 'CDM TV estará disponible cuando se conecte el canal de YouTube.'; return; }
    retry.hidden = true; status.textContent = 'Conectando con CDM TV…'; root!.setAttribute('aria-busy', 'true');
    try {
      const { ok, data } = await fetchTv(root!.dataset.api!, refresh);
      root!.querySelectorAll<HTMLAnchorElement>('[data-channel]').forEach(link => { link.hidden = !data.channelUrl; if (data.channelUrl) link.href = data.channelUrl; });
      if (!ok || data.status === 'error') throw new Error('YouTube');
      status.textContent = data.status === 'unconfigured' ? 'CDM TV estará disponible cuando se conecte el canal de YouTube.' : data.videos.length || data.featured ? '' : 'El canal todavía no tiene vídeos públicos disponibles.';
      status.hidden = !status.textContent;
      library = data.videos.filter(v => (v.state === 'video' || v.state === 'completed') && v.id !== data.featured?.id).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      find('[data-filters]').hidden = library.length === 0;
      renderLibrary();
      const broadcasts = data.videos.filter(v => (v.state === 'live' || v.state === 'upcoming') && v.id !== data.featured?.id).sort((a, b) => a.state === b.state ? (a.scheduledAt || '').localeCompare(b.scheduledAt || '') : a.state === 'live' ? -1 : 1);
      find('[data-broadcasts]').hidden = broadcasts.length === 0;
      find('[data-broadcast-videos]').replaceChildren(...broadcasts.map(card));
      find('[data-discovery]').textContent = data.liveDiscovery ? 'Los estados pueden tardar en actualizarse. Consulta YouTube para comprobar la emisión actual.' : 'Consulta el canal en YouTube para ver todas las emisiones.';
      if (data.featured) {
        find('[data-feature-screen]').replaceChildren(playButton(data.featured, true)); find('[data-feature-title]').textContent = data.featured.title;
        find('[data-feature-description]').textContent = `${labels[data.featured.state]}${data.featured.scheduledAt && data.featured.state === 'upcoming' ? ` · ${date(data.featured.scheduledAt, true)} (hora de Madrid)` : ''}`;
      }
    } catch {
      status.hidden = false;
      status.textContent = 'No hemos podido conectar con CDM TV. Vuelve a intentarlo en unos instantes.'; retry.hidden = false;
    } finally { root!.removeAttribute('aria-busy'); }
  }
  retry.addEventListener('click', () => void load(true)); void load();
}
