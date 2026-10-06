const hero = document.querySelector<HTMLElement>('[data-home-film]');
const video = hero?.querySelector<HTMLVideoElement>('video');

if (hero && video) {
  const slides = [...hero.querySelectorAll<HTMLElement>('[data-hero-slide]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let failed = false;
  let fallback = true;
  let current = 0;
  let rotation: ReturnType<typeof setTimeout> | undefined;
  let playbackDeadline: ReturnType<typeof setTimeout> | undefined;

  const stopRotation = () => { clearTimeout(rotation); rotation = undefined; };
  const stopDeadline = () => { clearTimeout(playbackDeadline); playbackDeadline = undefined; };
  const rotate = () => {
    stopRotation();
    if (!fallback || motion.matches || document.hidden || slides.length < 2) return;
    rotation = setTimeout(async () => {
      const next = (current + 1) % slides.length;
      const image = slides[next].querySelector<HTMLImageElement>('img');
      try {
        if (image) { image.loading = 'eager'; await image.decode(); }
        if (!fallback || motion.matches || document.hidden) return;
        slides[current].classList.remove('home-hero__slide--active');
        slides[next].classList.add('home-hero__slide--active');
        current = next;
      } catch { /* Keep the visible photo if the next one cannot load. */ }
      rotate();
    }, 5500);
  };
  const showPhotos = () => {
    if (!fallback && slides.length) {
      slides[current].classList.remove('home-hero__slide--active');
      current = 0;
      slides[current].classList.add('home-hero__slide--active');
    }
    fallback = true;
    hero.classList.remove('home-hero--has-film');
    rotate();
  };
  const watchPlayback = () => {
    stopDeadline();
    playbackDeadline = setTimeout(showPhotos, 6000);
  };
  const play = () => {
    if (failed || motion.matches || document.hidden) { showPhotos(); return; }
    if (video.paused) {
      watchPlayback();
      void video.play().catch(() => { stopDeadline(); showPhotos(); });
    }
  };
  video.addEventListener('playing', () => {
    if (motion.matches || document.hidden) { video.pause(); return; }
    stopDeadline(); stopRotation();
    fallback = false;
    hero.classList.add('home-hero--has-film');
  });
  video.addEventListener('error', () => {
    failed = true; stopDeadline(); showPhotos();
  });
  video.addEventListener('waiting', watchPlayback);
  video.addEventListener('stalled', watchPlayback);
  video.addEventListener('pause', () => { stopDeadline(); showPhotos(); });
  video.muted = true;
  video.autoplay = true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const start = () => {
    if (motion.matches || connection?.saveData) {
      video.pause(); showPhotos(); return;
    }
    if (!video.getAttribute('src')) {
      video.src = window.matchMedia('(max-width: 767px)').matches
        ? video.dataset.filmMobile || '' : video.dataset.filmDesktop || '';
      video.load();
    }
    play();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopRotation(); stopDeadline(); video.pause(); }
    else { if (fallback) rotate(); start(); }
  });
  window.addEventListener('pageshow', start);
  motion.addEventListener('change', () => { stopRotation(); start(); });
  start();
}
