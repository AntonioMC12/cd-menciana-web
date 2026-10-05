const hero = document.querySelector<HTMLElement>('[data-home-film]');
const video = hero?.querySelector<HTMLVideoElement>('video');

if (hero && video) {
  let failed = false;
  const play = () => {
    if (!failed && video.paused) void video.play().catch(() => {
      // Keep the static poster when the browser prevents autoplay.
    });
  };
  video.addEventListener('playing', () => hero.classList.add('home-hero--has-film'));
  video.addEventListener('error', () => {
    failed = true;
    hero.classList.remove('home-hero--has-film');
  });
  video.muted = true;
  video.autoplay = true;
  video.src = window.matchMedia('(max-width: 767px)').matches
    ? video.dataset.filmMobile || ''
    : video.dataset.filmDesktop || '';
  video.load();
  play();
  // Resume if the browser suspended playback while the tab was hidden.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) play();
  });
  window.addEventListener('pageshow', play);
}
