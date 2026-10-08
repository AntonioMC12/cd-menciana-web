import { site } from '../data/site';

const origin = process.env.PUBLIC_SITE_URL || 'https://cdmenciana.es';
export const absolutePage = (path: string) => new URL(path, origin).href;
export const defaultSeoDescription = 'Web oficial del CD Menciana Apaga y Vámonos F.S., club de fútbol sala de Doña Mencía, Córdoba: equipos, calendario, resultados y noticias.';
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
