// Optional enhancement: content remains visible without JavaScript or animation.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches) {
  document.querySelectorAll('.home-hero__copy > *').forEach((element, index) => {
    element.animate([{ opacity: .4, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, delay: index * 90, easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
}
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.animate([{ opacity: .5, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
      observer.unobserve(entry.target);
    }
  }, { threshold: .08 });
  document.querySelectorAll('[data-home-reveal]').forEach(section => observer.observe(section));
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    document.querySelector('.home-page')?.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  });
}
