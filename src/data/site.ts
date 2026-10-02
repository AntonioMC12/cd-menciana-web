import type { Article, Match, Player, Sponsor, Team } from './types';

export const site = {
  name: 'CD Menciana',
  fullName: 'Club Deportivo Menciana Apaga y Vámonos F.S.',
  location: 'Doña Mencía',
  season: '2026/27',
  tagline: 'Más que fútbol sala',
  description: 'Espacio oficial del CD Menciana: club, equipos, calendario, noticias y colaboradores.',
  // Replace with verified institutional details before launch.
  email: undefined as string | undefined,
  address: undefined as string | undefined,
  socials: [] as { label: string; url: string }[],
};

export const teams: Team[] = [
  {
    id: 'primer-equipo',
    name: 'Primer equipo',
    category: 'Fútbol sala',
    season: site.season,
    description: 'La información de competición y plantilla se publicará cuando el club la confirme.',
    status: 'provisional',
  },
];

// Keep sports records empty until the club provides verified information.
export const players: Player[] = [];
export const matches: Match[] = [];
export const sponsors: Sponsor[] = [
  { id: 'capricho-andaluz', name: 'Capricho Andaluz', logo: '/images/patrocinadores/capricho-andaluz.png', kind: 'sponsor', tier: 'principal', status: 'confirmed' },
  { id: 'ravi', name: 'RAVI', logo: '/images/patrocinadores/ravi.png', kind: 'sponsor', tier: 'principal', status: 'confirmed' },
  { id: 'wedding', name: 'Wedding Festival', logo: '/images/patrocinadores/wedding.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'tercera-division-futsal', name: '3ª División Futsal', logo: '/images/patrocinadores/tercera-division-futsal.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'area-pub', name: 'Área Pub', logo: '/images/patrocinadores/area-pub.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'aurea-estudio-dental', name: 'Áurea Estudio Dental', logo: '/images/patrocinadores/aurea-estudio-dental.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'bar-lama', name: 'Bar Cafetería Lama', logo: '/images/patrocinadores/bar-lama.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'centro-cicloturista', name: 'Centro Cicloturista Subbética', logo: '/images/patrocinadores/centro-cicloturista.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'discopub', name: 'Café Pub Disco Francis', logo: '/images/patrocinadores/discopub.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'esencia-de-olivar', name: 'Esencia de Olivar', logo: '/images/patrocinadores/esencia-de-olivar.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'factoria', name: 'Factoría', logo: '/images/patrocinadores/factoria.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'fernando-tienda-training', name: 'Fernando Tienda Training', logo: '/images/patrocinadores/fernando-tienda-training.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'lucinve', name: 'Lucinve', logo: '/images/patrocinadores/lucinve.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'santa-rita', name: 'Santa Rita', logo: '/images/patrocinadores/santa-rita.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'la-molinera', name: 'La Molinera', logo: '/images/patrocinadores/la-molinera.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'transportes-de-la-torre', name: 'Transportes Miguel de la Torre', logo: '/images/patrocinadores/transportes-de-la-torre.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'funeraria-leal', name: 'Funeraria Leal', logo: '/images/patrocinadores/funeraria-leal.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'domingo-cordoba', name: 'Domingo Córdoba', logo: '/images/patrocinadores/domingo-cordoba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'mundo-olive', name: 'MundoOlive', logo: '/images/patrocinadores/mundo-olive.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'pablo-remacha', name: 'Asesoría Energética Pablo Remacha', logo: '/images/patrocinadores/pablo-remacha.webp', logoBackground: 'dark', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'estudio-dental-javier-flores', name: 'Estudio Dental Javier Flores', logo: '/images/patrocinadores/estudio-dental-javier-flores.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'tanatorios-de-cordoba', name: 'Tanatorios de Córdoba', logo: '/images/patrocinadores/tanatorios-de-cordoba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'junta-de-andalucia', name: 'Junta de Andalucía', logo: '/images/patrocinadores/junta-de-andalucia.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'ayuntamiento-dona-mencia', name: 'Ayuntamiento de Doña Mencía', logo: '/images/patrocinadores/ayuntamiento-dona-mencia.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'diputacion-de-cordoba', name: 'Diputación de Córdoba', logo: '/images/patrocinadores/diputacion-de-cordoba.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'deportes-dona-mencia', name: 'Deportes Doña Mencía', logo: '/images/patrocinadores/deportes-dona-mencia.png', logoBackground: 'dark', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
];
export const principalSponsors = sponsors.filter((sponsor) => sponsor.kind === 'sponsor' && sponsor.tier === 'principal');
export const otherSponsors = sponsors.filter((sponsor) => sponsor.kind === 'sponsor' && sponsor.tier === 'colaborador');
export const institutionalPartners = sponsors.filter((sponsor) => sponsor.kind === 'institutional');

// Editorial examples demonstrate the news workflow. They are visibly labelled on every page.
export const articles: Article[] = [
  {
    slug: 'espacio-para-la-actualidad-del-club',
    title: 'Un espacio para la actualidad del club',
    excerpt: 'Aquí tendrán cabida los comunicados, las crónicas y las novedades de cada jornada.',
    body: [
      'Este artículo es un ejemplo provisional para mostrar cómo se publicarán las noticias del CD Menciana.',
      'Cuando el club facilite información contrastada, bastará con sustituir este contenido en el archivo de datos. La presentación de la noticia se actualizará automáticamente.',
    ],
    category: 'Club',
    status: 'provisional',
  },
  {
    slug: 'la-jornada-en-un-vistazo',
    title: 'La jornada, en un vistazo',
    excerpt: 'La previa y el resumen de cada partido podrán consultarse desde un mismo lugar.',
    body: [
      'Esta publicación es una muestra del formato previsto para las previas y crónicas de partido.',
      'Los rivales, horarios, resultados y fotografías se añadirán únicamente cuando estén confirmados.',
    ],
    category: 'Competición',
    status: 'provisional',
  },
  {
    slug: 'personas-que-hacen-club',
    title: 'Las personas que hacen club',
    excerpt: 'Una sección para contar las historias de quienes forman parte del CD Menciana.',
    body: [
      'Esta noticia de muestra reserva un espacio para entrevistas y relatos sobre el club.',
      'No representa una entrevista real ni atribuye declaraciones a ninguna persona.',
    ],
    category: 'Comunidad',
    status: 'provisional',
  },
];

export const upcomingMatches = matches
  .filter((match) => match.status === 'scheduled')
  .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

export const recentResults = matches
  .filter((match) => match.status === 'finished')
  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
