type PreviewProduct = {
  id: string; name: string; category: string; description: string; priceLabel: string; contactUrl: string;
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
