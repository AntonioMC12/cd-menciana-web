// Native modal dialog supplies focus containment and inert background content.
for (const root of document.querySelectorAll<HTMLElement>('[data-photo-gallery]')) {
  const tiles = [...root.querySelectorAll<HTMLButtonElement>('[data-photo]')];
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const stage = root.querySelector<HTMLElement>('.photo-viewer__stage')!;
  const image = root.querySelector<HTMLImageElement>('[data-viewer-image]')!;
  const status = root.querySelector<HTMLElement>('[data-load-status]')!;
  const counter = root.querySelector<HTMLElement>('[data-counter]')!;
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  const downloadStatus = root.querySelector<HTMLElement>('[data-download-status]')!;
  const control = (name: string) => root.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
  let index = 0, generation = 0, zoom = 1, maximum = 3, x = 0, y = 0, savedScroll = 0;
  let returnFocus: HTMLElement | null = null;
  let bodyStyle = '', htmlScroll = '', ready = false;
  let downloadRequest: AbortController | undefined;
  const pointers = new Map<number, { x: number; y: number }>();
  let start = { x: 0, y: 0 }, last = { x: 0, y: 0 }, pinchDistance = 0, pinchZoom = 1, hadPinch = false, lastTap = 0;
  let lastPointerType = 'mouse';
  const transform = () => {
    const maxX = Math.max(0, (image.offsetWidth * zoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * zoom - stage.clientHeight) / 2);
    x = Math.max(-maxX, Math.min(maxX, x)); y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    stage.classList.toggle('is-zoomed', zoom > 1);
    control('in').disabled = !ready || zoom >= maximum;
    control('out').disabled = !ready || zoom <= 1;
    control('reset').disabled = !ready || zoom === 1;
  };
  const reset = () => { zoom = 1; x = y = 0; lastTap = 0; pointers.clear(); transform(); };
  const setZoom = (value: number) => { zoom = Math.max(1, Math.min(maximum, value)); if (zoom === 1) x = y = 0; transform(); };
  function resolutionLimit() {
    const fit = Math.min(1, stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight);
    image.style.width = `${image.naturalWidth * fit}px`;
    image.style.height = `${image.naturalHeight * fit}px`;
    maximum = Math.max(1, Math.min(4, image.naturalWidth / Math.max(1, image.offsetWidth)));
    setZoom(zoom);
  }
  async function show(next: number) {
    if (next < 0 || next >= tiles.length) return;
    const token = ++generation;
    index = next; ready = false; reset(); downloadRequest?.abort();
    downloadStatus.textContent = '';
    control('download').disabled = true;
    control('prev').disabled = index === 0;
    control('next').disabled = index === tiles.length - 1;
    status.textContent = 'Cargando fotografía…';
    const tile = tiles[index];
    const pending = new Image(); pending.src = tile.dataset.src!;
    try {
      await pending.decode();
      if (token !== generation || !dialog.open) return;
      image.src = pending.src; image.alt = tile.querySelector('img')!.alt;
      image.hidden = false; ready = true;
      counter.textContent = `${index + 1} de ${tiles.length}`;
      caption.textContent = image.alt;
      status.textContent = ''; resolutionLimit();
      control('download').disabled = false;
      // Preload only neighbours, never the entire album.
      for (const neighbour of [index - 1, index + 1]) {
        if (tiles[neighbour]) { const preload = new Image(); preload.src = tiles[neighbour].dataset.src!; }
      }
    } catch {
      if (token !== generation || !dialog.open) return;
      image.hidden = true;
      counter.textContent = `${index + 1} de ${tiles.length}`;
      caption.textContent = tile.querySelector('img')!.alt;
      status.textContent = 'No se pudo cargar esta fotografía. Puedes cambiar de foto o reintentar al volver a ella.';
      control('download').disabled = false;
    }
  }
  tiles.forEach((tile, position) => {
    const thumbnail = tile.querySelector('img')!;
    const fail = () => { thumbnail.hidden = true; tile.querySelector<HTMLElement>('.photo-tile__fallback')!.hidden = false; };
    thumbnail.addEventListener('error', fail);
    if (thumbnail.complete && !thumbnail.naturalWidth) fail();
    tile.addEventListener('click', () => {
      returnFocus = tile; savedScroll = window.scrollY;
      bodyStyle = document.body.style.cssText; htmlScroll = document.documentElement.style.scrollBehavior;
      document.body.style.position = 'fixed'; document.body.style.top = `-${savedScroll}px`;
      document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
      image.hidden = true; caption.textContent = ''; counter.textContent = '';
      dialog.showModal(); control('close').focus(); void show(position);
    });
  });
  dialog.addEventListener('close', () => {
    generation++; downloadRequest?.abort(); pointers.clear();
    document.body.style.cssText = bodyStyle;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScroll); document.documentElement.style.scrollBehavior = htmlScroll;
    returnFocus?.focus({ preventScroll: true });
  });
  control('close').addEventListener('click', () => dialog.close());
  control('prev').addEventListener('click', () => void show(index - 1));
  control('next').addEventListener('click', () => void show(index + 1));
  control('in').addEventListener('click', () => setZoom(zoom * 1.5));
  control('out').addEventListener('click', () => setZoom(zoom / 1.5));
  control('reset').addEventListener('click', reset);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.disabled && button.getClientRects().length);
      const first = controls[0], lastControl = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); lastControl?.focus(); }
      else if (!event.shiftKey && (document.activeElement === lastControl || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); void show(index + (event.key === 'ArrowLeft' ? -1 : 1)); }
  });
  stage.addEventListener('wheel', event => { event.preventDefault(); if (ready) setZoom(zoom * Math.exp(-event.deltaY * .002)); }, { passive: false });
  stage.addEventListener('dblclick', () => { if (ready && lastPointerType === 'mouse') setZoom(zoom > 1 ? 1 : Math.min(2, maximum)); });
  const distance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  stage.addEventListener('pointerdown', event => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
    lastPointerType = event.pointerType;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) { start = last = { x: event.clientX, y: event.clientY }; hadPinch = false; }
    if (pointers.size === 2) { hadPinch = true; pinchDistance = distance(); pinchZoom = zoom; }
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) { setZoom(pinchZoom * distance() / Math.max(1, pinchDistance)); }
    else if (zoom > 1) { x += event.clientX - last.x; y += event.clientY - last.y; transform(); }
    last = { x: event.clientX, y: event.clientY };
  });
  const release = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size) { last = [...pointers.values()][0]; return; }
    if (hadPinch || event.type === 'pointercancel') return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (zoom === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5 && event.pointerType !== 'mouse') { void show(index + (dx < 0 ? 1 : -1)); }
    else if (event.pointerType !== 'mouse' && Math.hypot(dx, dy) < 12) {
      const now = performance.now(); if (now - lastTap < 300) { setZoom(zoom > 1 ? 1 : Math.min(2, maximum)); lastTap = 0; } else lastTap = now;
    }
  };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  window.addEventListener('resize', () => { if (dialog.open && ready) resolutionLimit(); });
  control('download').addEventListener('click', async () => {
    downloadRequest?.abort(); const request = new AbortController(); downloadRequest = request;
    const current = index, token = generation;
    control('download').disabled = true; downloadStatus.textContent = 'Preparando descarga…';
    try {
      const response = await fetch(tiles[current].dataset.download!, { signal: request.signal });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('download');
      const blob = await response.blob();
      if (request.signal.aborted || token !== generation || !dialog.open) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      const title = (root.dataset.title || 'cd-menciana').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
      link.href = url; link.download = `${title || 'cd-menciana'}-${String(current + 1).padStart(3, '0')}.webp`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      downloadStatus.textContent = 'Descarga iniciada.';
    } catch {
      if (!request.signal.aborted && token === generation) downloadStatus.textContent = 'No se pudo descargar. Vuelve a intentarlo.';
    } finally { if (token === generation && dialog.open) control('download').disabled = false; }
  });
}
