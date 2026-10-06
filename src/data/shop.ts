import { site } from './site';

export type ShopCategory = 'Equipaciones' | 'Porteros' | 'Entrenamiento' | 'Paseo' | 'Complementos' | 'Socios';
export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  images: { src: string; alt: string; width: number; height: number }[];
  price?: number;
  priceConfirmed?: boolean;
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
  { id: 'tarjeta-socio', name: 'Tarjeta de socio · Temporada 26/27', category: 'Socios', description: 'Tarjeta de socio del CD Menciana para la temporada 26/27. Consulta con el club las condiciones y cómo solicitarla.', price: 30, availability: 'Consulta las condiciones de socio por WhatsApp.', images: [{ src: '/images/tienda/tarjeta-socio.webp', alt: 'Tarjeta de socio del CD Menciana, temporada 26/27, sostenida en una mano', width: 1254, height: 1254 }] },
  { id: 'bufanda', name: 'Bufanda del CD Menciana', category: 'Complementos', description: 'Bufanda azul y blanca con el nombre y los escudos del club.', price: 12, availability: 'Consulta disponibilidad por WhatsApp.', images: [{ src: '/images/tienda/bufanda.webp', alt: 'Bufanda azul y blanca del CD Menciana con flecos y escudos en ambos extremos', width: 1400, height: 468 }] },
  { id: 'primera-equipacion-superior', name: 'Camiseta · Primera equipación', category: 'Equipaciones', description: 'Camiseta del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('primera-equipacion-superior', 'Camiseta · Primera equipación', 586, 351) },
  { id: 'primera-equipacion-inferior', name: 'Pantalón corto · Primera equipación', category: 'Equipaciones', description: 'Pantalón corto del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('primera-equipacion-inferior', 'Pantalón corto · Primera equipación', 491, 243) },
  { id: 'segunda-equipacion-superior', name: 'Camiseta · Segunda equipación', category: 'Equipaciones', description: 'Camiseta del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('segunda-equipacion-superior', 'Camiseta · Segunda equipación', 572, 353) },
  { id: 'segunda-equipacion-inferior', name: 'Pantalón corto · Segunda equipación', category: 'Equipaciones', description: 'Pantalón corto del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('segunda-equipacion-inferior', 'Pantalón corto · Segunda equipación', 514, 242) },
  { id: 'portero-primera-superior', name: 'Camiseta · Primera equipación de portero', category: 'Porteros', description: 'Camiseta del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('portero-primera-superior', 'Camiseta · Primera equipación de portero', 575, 302) },
  { id: 'portero-primera-inferior', name: 'Pantalón corto · Primera equipación de portero', category: 'Porteros', description: 'Pantalón corto del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('portero-primera-inferior', 'Pantalón corto · Primera equipación de portero', 517, 177) },
  { id: 'portero-segunda-superior', name: 'Camiseta · Segunda equipación de portero', category: 'Porteros', description: 'Camiseta del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('portero-segunda-superior', 'Camiseta · Segunda equipación de portero', 584, 286) },
  { id: 'portero-segunda-inferior', name: 'Pantalón corto · Segunda equipación de portero', category: 'Porteros', description: 'Pantalón corto del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('portero-segunda-inferior', 'Pantalón corto · Segunda equipación de portero', 485, 160) },
  { id: 'entrenamiento-primer-equipo-superior', name: 'Camiseta de entrenamiento · Primer equipo', category: 'Entrenamiento', description: 'Camiseta de entrenamiento del club. Se vende por separado del pantalón.', price: 20, images: image('entrenamiento-primer-equipo-superior', 'Camiseta de entrenamiento · Primer equipo', 681, 427) },
  { id: 'pantalon-entrenamiento', name: 'Pantalón corto de entrenamiento', category: 'Entrenamiento', description: 'Pantalón corto azul de entrenamiento, común a todas las categorías del club. Se vende por separado de la camiseta.', price: 10, images: [{ src: '/images/tienda/pantalon-entrenamiento.webp', alt: 'Pantalón corto azul de entrenamiento con cintura elástica y marca Kedeke', width: 798, height: 1011 }] },
  { id: 'entrenamiento-filial-superior', name: 'Camiseta de entrenamiento · Filial', category: 'Entrenamiento', description: 'Camiseta de entrenamiento del club. Se vende por separado del pantalón.', price: 20, images: image('entrenamiento-filial-superior', 'Camiseta de entrenamiento · Filial', 681, 419) },
  { id: 'entrenamiento-cadete-superior', name: 'Camiseta de entrenamiento · Cadete', category: 'Entrenamiento', description: 'Camiseta de entrenamiento del club. Se vende por separado del pantalón.', price: 20, images: image('entrenamiento-cadete-superior', 'Camiseta de entrenamiento · Cadete', 723, 462) },
  { id: 'entrenamiento-infantil-superior', name: 'Camiseta de entrenamiento · Infantil', category: 'Entrenamiento', description: 'Camiseta de entrenamiento del club. Se vende por separado del pantalón.', price: 20, images: image('entrenamiento-infantil-superior', 'Camiseta de entrenamiento · Infantil', 723, 460) },
  { id: 'ropa-paseo-superior', name: 'Polo de paseo', category: 'Paseo', description: 'Polo de paseo del club. Se vende por separado del pantalón.', price: 20, priceConfirmed: true, images: image('ropa-paseo-superior', 'Polo de paseo', 599, 389) },
  { id: 'ropa-paseo-inferior', name: 'Pantalón corto de paseo', category: 'Paseo', description: 'Pantalón corto de paseo del club. Se vende por separado de la prenda superior.', price: 15, priceConfirmed: true, images: image('ropa-paseo-inferior', 'Pantalón corto de paseo', 493, 300) },
  { id: 'chandal-primer-equipo-superior', name: 'Chaqueta de chándal · Primer equipo', category: 'Paseo', description: 'Chaqueta de chándal del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('chandal-primer-equipo-superior', 'Chaqueta de chándal · Primer equipo', 466, 283) },
  { id: 'chandal-primer-equipo-inferior', name: 'Pantalón largo de chándal · Primer equipo', category: 'Paseo', description: 'Pantalón largo de chándal del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('chandal-primer-equipo-inferior', 'Pantalón largo de chándal · Primer equipo', 457, 360) },
  { id: 'chandal-base-superior', name: 'Chaqueta de chándal · Categorías de base', category: 'Paseo', description: 'Chaqueta de chándal del club. Se vende por separado del pantalón.', price: 25, priceConfirmed: true, images: image('chandal-base-superior', 'Chaqueta de chándal · Categorías de base', 466, 283) },
  { id: 'chandal-base-inferior', name: 'Pantalón largo de chándal · Categorías de base', category: 'Paseo', description: 'Pantalón largo de chándal del club. Se vende por separado de la prenda superior.', price: 20, priceConfirmed: true, images: image('chandal-base-inferior', 'Pantalón largo de chándal · Categorías de base', 457, 360) },
];

export const formatShopPrice = (price?: number) => price === undefined
  ? 'Precio a consultar'
  : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);

export function productContactUrl(product?: ShopProduct, variant?: string) {
  const subject = product ? `Consulta de tienda: ${product.name}` : 'Consulta de la tienda del CD Menciana';
  const body = product?.category === 'Socios'
    ? `Hola, me interesa ${product.name}.\n\n¿Podéis informarme sobre las condiciones, el precio definitivo y cómo solicitarla?\n\nGracias.`
    : product?.category === 'Complementos'
    ? `Hola, me interesa ${product.name}.\n\n¿Podéis confirmarme disponibilidad, precio definitivo, pago y entrega?\n\nGracias.`
    : product
    ? `Hola, me interesa ${product.name}${variant ? ` (${variant})` : ''}.\n\nTalla que me interesa: \n\n¿Podéis confirmarme disponibilidad, precio definitivo, pago y entrega?\n\nGracias.`
    : 'Hola, me gustaría consultar los productos de la tienda del club. ¿Podéis informarme sobre disponibilidad, precios, pago y entrega?\n\nGracias.';
  if (shop.contact.whatsappConfirmed && !shop.contact.phoneIsExample && shop.contact.phone) {
    return `https://wa.me/${shop.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
  }
  return `mailto:${shop.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
