import { site } from '../data/site';

const origin = process.env.PUBLIC_SITE_URL || 'https://cdmenciana.es';
export const absolutePage = (path: string) => new URL(path, origin).href;
export const defaultSeoDescription = 'Web oficial del CD Menciana Apaga y Vámonos F.S., club de fútbol sala de Doña Mencía, Córdoba: equipos, calendario, resultados y noticias.';
// Metadata only: these descriptions never replace the visible page content.
export const sectionSeo: Record<string, { name: string; type: string; description: string }> = {
  '/club': { name: 'El club', type: 'AboutPage', description: 'Historia, escudos y junta directiva del CD Menciana Apaga y Vámonos F.S., club de fútbol sala de Doña Mencía, Córdoba.' },
  '/equipos': { name: 'Equipos', type: 'CollectionPage', description: 'Equipos y plantillas del CD Menciana, club de fútbol sala de Doña Mencía: partidos, resultados y clasificaciones de la temporada 2026/27.' },
  '/calendario': { name: 'Calendario', type: 'CollectionPage', description: 'Calendario de fútbol sala del CD Menciana de Doña Mencía: fechas, rivales, pabellones, jornadas y resultados de sus equipos en 2026/27.' },
  '/noticias': { name: 'Noticias', type: 'CollectionPage', description: 'Crónicas, resultados y actualidad del CD Menciana Apaga y Vámonos F.S., club de fútbol sala de Doña Mencía, Córdoba.' },
  '/galerias': { name: 'Galerías', type: 'CollectionPage', description: 'Galerías de fotografías de partidos y actividades del CD Menciana, club de fútbol sala de Doña Mencía, Córdoba.' },
  '/patrocinadores': { name: 'Colaboradores', type: 'CollectionPage', description: 'Patrocinadores y entidades colaboradoras del CD Menciana, club de fútbol sala de Doña Mencía: empresas y apoyos al deporte local.' },
  '/tienda': { name: 'Tienda', type: 'CollectionPage', description: 'Tienda oficial del CD Menciana de Doña Mencía: equipaciones, ropa de entrenamiento y de paseo. Consulta los artículos y contacta con el club.' },
  '/contacto': { name: 'Contacto', type: 'ContactPage', description: 'Contacta con el CD Menciana de Doña Mencía: correo y redes oficiales del club. Sede en el Pabellón de Deportes Alcalde Julio Priego.' },
};
export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'SportsOrganization',
  '@id': absolutePage('/#club'),
  name: site.fullName,
  alternateName: [site.name, 'CDMenciana', 'Apaga y Vámonos F.S.'],
  description: defaultSeoDescription,
  sport: 'Fútbol sala',
  url: absolutePage('/'),
  logo: absolutePage('/images/escudo-oficial.svg'),
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: site.location,
    addressRegion: 'Córdoba',
    addressCountry: 'ES',
  },
  location: {
    '@type': 'Place',
    name: site.address,
  },
  sameAs: site.socials.map(social => social.url),
};
export const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': absolutePage('/#website'),
  name: site.name,
  alternateName: ['CDMenciana', site.fullName],
  url: absolutePage('/'),
  inLanguage: 'es',
  publisher: { '@id': organizationData['@id'] },
};
export const webpageData = (url: string, name: string, description: string, type = 'WebPage') => ({
  '@context': 'https://schema.org',
  '@type': type,
  '@id': `${url}#webpage`,
  url,
  name,
  description,
  inLanguage: 'es',
  isPartOf: { '@id': websiteData['@id'] },
  about: { '@id': organizationData['@id'] },
});
export const breadcrumbData = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absolutePage(item.path),
  })),
});
