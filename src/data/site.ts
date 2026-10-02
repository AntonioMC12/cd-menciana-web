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

// Keep these lists empty until the club provides verified records.
export const players: Player[] = [];
export const matches: Match[] = [];
export const sponsors: Sponsor[] = [];

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
