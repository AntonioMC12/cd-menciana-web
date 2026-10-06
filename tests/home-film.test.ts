import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpile(readFileSync('src/scripts/home-film.ts', 'utf8'));
const classList = (initial: string[] = []) => {
  const values = new Set(initial);
  return { add: (value: string) => values.add(value), remove: (value: string) => values.delete(value), contains: (value: string) => values.has(value) };
};
function setup({ mode = 'playing', mobile = false, reduce = false, saveData = false } = {}) {
  vi.useFakeTimers();
  const motion = Object.assign(new EventTarget(), { matches: reduce });
  const slides = Array.from({ length: 4 }, (_, index) => ({
    classList: classList(index === 0 ? ['home-hero__slide--active'] : []),
    querySelector: () => ({ loading: 'lazy', decode: () => Promise.resolve() }),
  }));
  const videoEvents = new EventTarget();
  const video = Object.assign(videoEvents, {
    paused: true, src: '', muted: false, autoplay: false,
    dataset: { filmMobile: 'mobile.mp4', filmDesktop: 'desktop.mp4' },
    getAttribute() { return this.src || null; }, load() {},
    play() {
      if (mode === 'blocked') return Promise.reject(new Error('Autoplay blocked'));
      if (mode === 'pending') return new Promise<void>(() => {});
      this.paused = false; videoEvents.dispatchEvent(new Event('playing')); return Promise.resolve();
    },
    pause() { if (!this.paused) { this.paused = true; videoEvents.dispatchEvent(new Event('pause')); } },
  });
  const hero = { classList: classList(), querySelector: () => video, querySelectorAll: () => slides };
  const document = Object.assign(new EventTarget(), { hidden: false, querySelector: () => hero });
  const window = Object.assign(new EventTarget(), { matchMedia: (query: string) => query.includes('reduced') ? motion : { matches: mobile } });
  vm.runInNewContext(code, { document, window, navigator: { connection: { saveData } }, setTimeout, clearTimeout });
  return { video, hero, document, motion, active: () => slides.findIndex(slide => slide.classList.contains('home-hero__slide--active')) };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('home video and photo fallback', () => {
  it('rotates all four photos when mobile autoplay is blocked', async () => {
    const page = setup({ mode: 'blocked', mobile: true });
    expect(page.video.src).toBe('mobile.mp4');
    await vi.advanceTimersByTimeAsync(0);
    for (const active of [1, 2, 3, 0]) {
      await vi.advanceTimersByTimeAsync(5500);
      expect(page.active()).toBe(active);
    }
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(false);
  });
  it('uses photos if playback never starts, and switches back if it recovers', async () => {
    const page = setup({ mode: 'pending' });
    await vi.advanceTimersByTimeAsync(11500);
    expect(page.active()).toBe(1);
    page.video.dispatchEvent(new Event('playing'));
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(true);
    await vi.advanceTimersByTimeAsync(11000);
    expect(page.active()).toBe(1);
  });
  it('falls back after a video error', async () => {
    const page = setup();
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(true);
    page.video.dispatchEvent(new Event('error'));
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(false);
    await vi.advanceTimersByTimeAsync(5500);
    expect(page.active()).toBe(1);
  });
  it('starts with the squad photo every time it switches back from video', async () => {
    const page = setup({ mode: 'pending' });
    expect(page.active()).toBe(0);
    await vi.advanceTimersByTimeAsync(11500);
    expect(page.active()).toBe(1);
    page.video.dispatchEvent(new Event('playing'));
    page.video.dispatchEvent(new Event('error'));
    expect(page.active()).toBe(0);
    await vi.advanceTimersByTimeAsync(5500);
    expect(page.active()).toBe(1);
  });
  it('handles prolonged buffering and resumes video when ready', async () => {
    const page = setup();
    page.video.dispatchEvent(new Event('waiting'));
    await vi.advanceTimersByTimeAsync(6000);
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(false);
    page.video.dispatchEvent(new Event('playing'));
    expect(page.hero.classList.contains('home-hero--has-film')).toBe(true);
  });
  it('suspends photos in a hidden tab and resumes on return', async () => {
    const page = setup({ mode: 'blocked' });
    await vi.advanceTimersByTimeAsync(0);
    page.document.hidden = true; page.document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(page.active()).toBe(0);
    page.document.hidden = false; page.document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(5500);
    expect(page.active()).toBe(1);
  });
  it('keeps one photo and avoids video download for reduced motion', async () => {
    const page = setup({ reduce: true });
    expect(page.video.src).toBe('');
    await vi.advanceTimersByTimeAsync(20000);
    expect(page.active()).toBe(0);
  });
  it('uses the carousel instead of downloading video with data saving enabled', async () => {
    const page = setup({ saveData: true });
    expect(page.video.src).toBe('');
    await vi.advanceTimersByTimeAsync(5500);
    expect(page.active()).toBe(1);
  });
});
