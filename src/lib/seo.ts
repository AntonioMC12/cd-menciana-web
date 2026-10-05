import { site } from '../data/site';

const origin = process.env.PUBLIC_SITE_URL || 'https://cdmenciana.es';
export const absolutePage = (path: string) => new URL(path, origin).href;
export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': absolutePage('/#club'),
  name: site.fullName,
  alternateName: site.name,
  url: absolutePage('/'),
  logo: absolutePage('/images/escudo-oficial.svg'),
  email: site.email,
  sameAs: site.socials.map(social => social.url),
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
