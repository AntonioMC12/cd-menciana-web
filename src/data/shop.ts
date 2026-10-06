import { site } from './site';

export type ShopCategory = 'Equipaciones' | 'Porteros' | 'Entrenamiento' | 'Paseo';
export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  images: { src: string; alt: string; width: number; height: number }[];
  price?: number;
  sizes?: string[];
  variants?: string[];
  availability?: string;
}

// Catálogo provisional. Sustituir los precios y confirmar tallas antes del lanzamiento.
export const shop = {
  preview: true,
  contact: { email: site.email, phone: '+34 628 112 604', phoneIsExample: false, whatsappConfirmed: true },
};

const image = (id: string, name: string, width: number, height: number) => [{
  src: `/images/tienda/${id}.webp`, alt: `${name}: vista delantera y trasera`, width, height,
}];

export const products: ShopProduct[] = [
  { id: 'primera-equipacion', name: 'Primera equipación', category: 'Equipaciones', description: 'Conjunto de camiseta blanca y pantalón negro del club.', price: 35, images: image('primera-equipacion', 'Primera equipación', 568, 570) },
  { id: 'segunda-equipacion', name: 'Segunda equipación', category: 'Equipaciones', description: 'Conjunto de camiseta y pantalón en tonos azules.', price: 35, images: image('segunda-equipacion', 'Segunda equipación', 552, 588) },
  { id: 'portero-primera', name: 'Primera equipación de portero', category: 'Porteros', description: 'Conjunto de portero en rojo, con los detalles del club.', price: 35, images: image('portero-primera', 'Primera equipación de portero', 551, 402) },
  { id: 'portero-segunda', name: 'Segunda equipación de portero', category: 'Porteros', description: 'Conjunto de portero en negro con detalles blancos.', price: 35, images: image('portero-segunda', 'Segunda equipación de portero', 580, 407) },
  { id: 'entrenamiento-primer-equipo', name: 'Entrenamiento · Primer equipo', category: 'Entrenamiento', description: 'Camiseta de entrenamiento blanca y azul con pantalón azul marino.', price: 30, images: image('entrenamiento-primer-equipo', 'Entrenamiento del primer equipo', 673, 631) },
  { id: 'entrenamiento-filial', name: 'Entrenamiento · Filial', category: 'Entrenamiento', description: 'Conjunto de entrenamiento con la gráfica y los colaboradores del filial.', price: 30, images: image('entrenamiento-filial', 'Entrenamiento del filial', 680, 616) },
  { id: 'entrenamiento-cadete', name: 'Entrenamiento · Cadete', category: 'Entrenamiento', description: 'Conjunto de camiseta y pantalón para el equipo cadete.', price: 30, images: image('entrenamiento-cadete', 'Entrenamiento del cadete', 709, 641) },
  { id: 'entrenamiento-infantil', name: 'Entrenamiento · Infantil', category: 'Entrenamiento', description: 'Conjunto de camiseta y pantalón para el equipo infantil.', price: 30, images: image('entrenamiento-infantil', 'Entrenamiento del infantil', 715, 643) },
  { id: 'ropa-paseo', name: 'Ropa de paseo', category: 'Paseo', description: 'Polo y pantalón corto azul marino con el escudo del club.', price: 32, images: image('ropa-paseo', 'Ropa de paseo', 582, 667) },
  { id: 'chandal-primer-equipo', name: 'Chándal · Primer equipo', category: 'Paseo', description: 'Conjunto de manga larga y pantalón largo azul marino.', price: 45, images: image('chandal-primer-equipo', 'Chándal del primer equipo', 462, 610) },
  { id: 'chandal-base', name: 'Chándal · Categorías de base', category: 'Paseo', description: 'Chándal azul marino con los detalles de las categorías de base.', price: 40, images: image('chandal-base', 'Chándal de las categorías de base', 478, 629) },
];

export const formatShopPrice = (price?: number) => price === undefined
  ? 'Precio a consultar'
  : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);

export function productContactUrl(product?: ShopProduct, variant?: string) {
  const subject = product ? `Consulta de tienda: ${product.name}` : 'Consulta de la tienda del CD Menciana';
  const body = product
    ? `Hola, me interesa ${product.name}${variant ? ` (${variant})` : ''}.\n\nTalla que me interesa: \n\n¿Podéis confirmarme disponibilidad, precio definitivo, pago y entrega?\n\nGracias.`
    : 'Hola, me gustaría consultar los productos de la tienda del club. ¿Podéis informarme sobre disponibilidad, precios, pago y entrega?\n\nGracias.';
  if (shop.contact.whatsappConfirmed && !shop.contact.phoneIsExample && shop.contact.phone) {
    return `https://wa.me/${shop.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
  }
  return `mailto:${shop.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
