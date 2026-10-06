export interface ShopAvailability {
  status: string;
  variants: { options: Record<string,string>; status: string }[];
}
export function availabilityTag(product?: ShopAvailability): { label: string; state: 'available' | 'partial' | 'order' | 'unknown' } {
  if (!product) return {label:'Consultar disponibilidad',state:'unknown'};
  const options = product.variants;
  const available = (status: string) => status === 'Disponible' || status === 'Stock bajo';
  if (options.length) {
    const count = options.filter(v => available(v.status)).length;
    if (count === options.length) return {label:'En stock',state:'available'};
    if (count) return {label:options.every(v => Object.hasOwn(v.options,'talla')) ? 'En stock en algunas tallas' : 'En stock en algunas opciones',state:'partial'};
    if (options.some(v => v.status !== 'Agotado')) return {label:'Consultar disponibilidad',state:'unknown'};
    return {label:'Pendiente de pedido',state:'order'};
  }
  if (available(product.status)) return {label:'En stock',state:'available'};
  return product.status === 'Agotado' ? {label:'Pendiente de pedido',state:'order'} : {label:'Consultar disponibilidad',state:'unknown'};
}
