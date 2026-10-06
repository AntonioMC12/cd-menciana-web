type PreviewProduct = {
  id: string; name: string; category: string; description: string; priceLabel: string; contactUrl: string; priceConfirmed?: boolean;
  images: { src: string; alt: string; width: number; height: number }[];
};
const cards = [...document.querySelectorAll<HTMLElement>('.shop-product')];
const filters = document.querySelector<HTMLElement>('.shop-filters');
if (filters) filters.hidden = false;
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; });
    const count = cards.filter(card => !card.hidden).length;
    const counter = document.querySelector('#shop-count');
    if (counter) counter.textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;
  });
});
const dialog = document.querySelector<HTMLDialogElement>('#shop-preview');
const data = document.querySelector('#shop-product-data');
// Availability is read fresh from D1, independently of the static catalogue build.
// This endpoint never exposes quantities, movement notes or session information.
const availabilityApi = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');
type PublicAvailability = { items: { id: string; status: string; variants: { options: Record<string,string>; status: string }[] }[] };
let availabilityLoading = false;
const availabilityFallback = new Map(cards.map(card => [card, card.querySelector('[data-availability]')?.textContent || 'Consultar disponibilidad con el club.']));
async function updateShopAvailability() {
  if (!availabilityApi || availabilityLoading) return;
  availabilityLoading = true;
  try {
    const response = await fetch(`${availabilityApi}/api/shop/availability`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
    const result = await response.json() as PublicAvailability;
    for (const card of cards) {
      const product = result.items.find(item => item.id === card.dataset.productId);
      const target = card.querySelector('[data-availability]');
      if (!target) continue;
      if (!product) { target.textContent = availabilityFallback.get(card)!; continue; }
      target.textContent = product.variants.length ? product.variants.map(variant => `${Object.entries(variant.options).map(([key,value])=>`${key}: ${value}`).join(' · ')}: ${variant.status}`).join(' / ') : product.status;
    }
  } catch {
    for (const card of cards) { const target = card.querySelector('[data-availability]'); if (target) target.textContent = availabilityFallback.get(card)!; }
  } finally { availabilityLoading = false; }
}
void updateShopAvailability();
window.addEventListener('pageshow', event => { if (event.persisted) void updateShopAvailability(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void updateShopAvailability(); });
window.setInterval(() => { if (!document.hidden) void updateShopAvailability(); }, 30000);
if (dialog && data) {
  const products: PreviewProduct[] = JSON.parse(data.textContent || '[]');
  const image = dialog.querySelector<HTMLImageElement>('#shop-dialog-image')!;
  const contact = dialog.querySelector<HTMLAnchorElement>('#shop-dialog-contact')!;
  let selected: PreviewProduct | undefined;
  let index = 0;
  let trigger: HTMLElement | undefined;
  const setText = (selector: string, value: string) => { const el = dialog.querySelector(selector); if (el) el.textContent = value; };
  const updateImage = () => {
    const current = selected?.images[index];
    if (!current) return;
    image.src = current.src; image.alt = current.alt;
    image.width = current.width; image.height = current.height;
    setText('#shop-gallery-count', `${index + 1} / ${selected!.images.length}`);
  };
  document.querySelectorAll<HTMLAnchorElement>('[data-preview]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      selected = products.find(product => product.id === link.dataset.preview);
      if (!selected?.images.length) return;
      event.preventDefault(); index = 0; trigger = link;
      setText('#shop-dialog-title', selected.name); setText('#shop-dialog-category', selected.category);
      setText('#shop-dialog-description', selected.description); setText('#shop-dialog-price', selected.priceLabel);
      const priceNote = dialog.querySelector<HTMLElement>('#shop-dialog-price-note');
      if (priceNote) priceNote.hidden = !!selected.priceConfirmed;
      contact.href = selected.contactUrl;
      dialog.querySelector<HTMLElement>('.shop-dialog__gallery')!.hidden = selected.images.length < 2;
      updateImage(); dialog.showModal();
    });
  });
  dialog.querySelector('.shop-dialog__close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger?.focus());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.querySelectorAll<HTMLButtonElement>('[data-gallery]').forEach(button => button.addEventListener('click', () => {
    if (!selected) return;
    index = (index + (button.dataset.gallery === 'next' ? 1 : -1) + selected.images.length) % selected.images.length;
    updateImage();
  }));
}
