import type { Match, Player, Sponsor, Team } from './types';
import { firstTeamMatches } from './first-team';

export const site = {
  name: 'CD Menciana',
  fullName: 'Club Deportivo Menciana Apaga y Vámonos F.S.',
  location: 'Doña Mencía',
  season: '2026/27',
  tagline: 'Más que fútbol sala',
  description: 'Espacio oficial del CD Menciana: club, equipos, calendario, noticias y colaboradores.',
  email: 'apagayvamonosfs@gmail.com',
  address: 'Pabellón de Deportes Alcalde Julio Priego, Doña Mencía (Córdoba)',
  socials: [
    { label: 'Instagram', url: 'https://www.instagram.com/cdmencianaapagayvamonosfs/' },
    { label: 'X', url: 'https://x.com/ApagayVamonosFS' },
    { label: 'Facebook', url: 'https://www.facebook.com/CDMencianaApagayVamonosFS/' },
  ] as { label: string; url: string }[],
};

export const teams: Team[] = [
  {
    id: 'primer-equipo',
    name: 'C.D. APAGA Y VAMONOS RAVI OBRAS & SERVICIOS',
    category: '3.ª División F.S. · Grupo 17',
    season: site.season,
    description: 'Apaga y Vámonos compite en el grupo 17 de Tercera División de fútbol sala.',
    status: 'confirmed',
  },
  { id: 'filial', name: 'FILIAL', category: '2.ª Andaluza Sénior F.S. · Grupo A', season: site.season, description: 'El filial compite en la liga sénior de Córdoba.', status: 'confirmed' },
  { id: 'cadete', name: 'CADETE', category: '2.ª Andaluza Cadete F.S. · Grupo A', season: site.season, description: 'El equipo cadete compite en la liga provincial de Córdoba.', status: 'confirmed' },
  { id: 'infantil', name: 'INFANTIL CENTRO CICLOTURISTA SUBBÉTICA', category: '2.ª Andaluza Infantil F.S. · Grupo B', season: site.season, description: 'El equipo infantil compite en la liga provincial de Córdoba.', status: 'confirmed' },
  { id: 'escuela-alevin', name: 'Escuela Alevín', category: 'Escuela', season: site.season, description: '', status: 'confirmed' },
  { id: 'escuela-benjamin', name: 'Escuela Benjamín', category: 'Escuela', season: site.season, description: '', status: 'confirmed' },
  { id: 'escuela-biberon', name: 'Escuela Biberón', category: 'Escuela', season: site.season, description: '', status: 'confirmed' },
];

// Numbers, names and goalkeeper positions supplied by the club.
// Field-player positions remain unset until the club confirms them.
export const players: Player[] = [
  { id: 'raton', teamId: 'primer-equipo', name: 'Jesús Luna', number: 1, position: 'Portero', photo: '/images/jugadores/raton.webp', status: 'confirmed' },
  { id: 'alex', teamId: 'primer-equipo', name: 'Álex', number: 25, position: 'Portero', photo: '/images/jugadores/alex.webp?v=2', status: 'confirmed' },
  { id: 'melli', teamId: 'primer-equipo', name: 'Melli', number: 15, position: 'Portero', photo: '/images/jugadores/melli.webp', status: 'confirmed' },
  { id: 'campitos', teamId: 'primer-equipo', name: 'Campitos', number: 4, photo: '/images/jugadores/campitos.webp', status: 'confirmed' },
  { id: 'cala', teamId: 'primer-equipo', name: 'Cala', number: 5, photo: '/images/jugadores/cala.webp?v=2', status: 'confirmed' },
  { id: 'mara', teamId: 'primer-equipo', name: 'Mara', number: 7, photo: '/images/jugadores/mara.webp', status: 'confirmed' },
  { id: 'cabezas', teamId: 'primer-equipo', name: 'Cabezas', number: 8, photo: '/images/jugadores/cabezas.webp', status: 'confirmed' },
  { id: 'tamajon', teamId: 'primer-equipo', name: 'Tamajón', number: 9, photo: '/images/jugadores/tamajon.webp', status: 'confirmed' },
  { id: 'david', teamId: 'primer-equipo', name: 'David', number: 10, photo: '/images/jugadores/david.webp', status: 'confirmed' },
  { id: 'jesus', teamId: 'primer-equipo', name: 'Jesús Cubero', number: 11, photo: '/images/jugadores/jesus.webp?v=2', status: 'confirmed' },
  { id: 'keko', teamId: 'primer-equipo', name: 'Keko', number: 13, photo: '/images/jugadores/keko.webp', status: 'confirmed' },
  { id: 'juanbo', teamId: 'primer-equipo', name: 'Juan Bonilla', number: 20, photo: '/images/jugadores/juanbo.webp', status: 'confirmed' },
  { id: 'borrallo', teamId: 'primer-equipo', name: 'Borrallo', number: 22, photo: '/images/jugadores/borrallo.webp', status: 'confirmed' },
  { id: 'isaac', teamId: 'primer-equipo', name: 'Isaac', number: 23, photo: '/images/jugadores/isaac.webp', status: 'confirmed' },
  { id: 'tetur', teamId: 'primer-equipo', name: 'Tetur', number: 27, photo: '/images/jugadores/tetur.webp', status: 'confirmed' },
  { id: 'adri-luna', teamId: 'primer-equipo', name: 'Adri Luna', number: 21, photo: '/images/jugadores/adri-luna.webp?v=2', status: 'confirmed' },
];
export const matches: Match[] = firstTeamMatches;
export const sponsors: Sponsor[] = [
  { id: 'capricho-andaluz', name: 'Capricho Andaluz', logo: '/images/patrocinadores/capricho-andaluz.png', website: 'https://caprichoandaluz.com/', kind: 'sponsor', tier: 'principal', status: 'confirmed' },
  { id: 'ravi', name: 'RAVI', logo: '/images/patrocinadores/ravi.png', website: 'https://ravi.es/', kind: 'sponsor', tier: 'principal', status: 'confirmed' },
  { id: 'wedding', name: 'Wedding Festival', logo: '/images/patrocinadores/wedding-festival.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'area-pub', name: 'Área Pub', logo: '/images/patrocinadores/area-pub.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'aurea-estudio-dental', name: 'Áurea Estudio Dental', logo: '/images/patrocinadores/aurea-estudio-dental.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'bar-lama', name: 'Bar Cafetería Lama', logo: '/images/patrocinadores/bar-lama.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'centro-cicloturista', name: 'Centro Cicloturista Subbética', logo: '/images/patrocinadores/centro-cicloturista.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'discopub', name: 'Café Pub Disco Francis', logo: '/images/patrocinadores/discopub.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'esencia-de-olivar', name: 'Esencia de Olivar', logo: '/images/patrocinadores/esencia-de-olivar.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'factoria', name: 'Factoría', logo: '/images/patrocinadores/factoria.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'fernando-tienda-training', name: 'Fernando Tienda Training', logo: '/images/patrocinadores/fernando-tienda-training.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'lucinve', name: 'Lucinve', logo: '/images/patrocinadores/lucinve-v2.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'santa-rita', name: 'Santa Rita', logo: '/images/patrocinadores/santa-rita.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'la-molinera', name: 'La Molinera', logo: '/images/patrocinadores/la-molinera.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'transportes-de-la-torre', name: 'Transportes Miguel de la Torre', logo: '/images/patrocinadores/transportes-de-la-torre.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'funeraria-leal', name: 'Funeraria Leal', logo: '/images/patrocinadores/funeraria-leal.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'domingo-cordoba', name: 'Domingo Córdoba', logo: '/images/patrocinadores/domingo-cordoba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'mundo-olive', name: 'MundoOlive', logo: '/images/patrocinadores/mundo-olive.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'pablo-remacha', name: 'Asesoría Energética Pablo Remacha', logo: '/images/patrocinadores/pablo-remacha.webp', logoBackground: 'dark', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'estudio-dental-javier-flores', name: 'Estudio Dental Javier Flores', logo: '/images/patrocinadores/estudio-dental-javier-flores.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'tanatorios-de-cordoba', name: 'Tanatorios de Córdoba', logo: '/images/patrocinadores/tanatorios-de-cordoba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'sergio-delin', name: 'Sergio Delin', logo: '/images/patrocinadores/sergio-delin.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'fotoregalo-personalizado', name: 'Fotoregalo Personalizado', logo: '/images/patrocinadores/fotoregalo-personalizado.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'juanma-cubero', name: 'Juanma Cubero · Diseño interior', logo: '/images/patrocinadores/juanma-cubero.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'menpi-cb', name: 'Menpi C.B.', logo: '/images/patrocinadores/menpi-cb.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'papeleria-blanca', name: 'Blanca · Papelería y librería', logo: '/images/patrocinadores/papeleria-blanca.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'jose-luis-borrallo', name: 'José Luis Borrallo López · Trabajos agrícolas', logo: '/images/patrocinadores/jose-luis-borrallo.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'productos-pedro', name: 'Productos Pedro', logo: '/images/patrocinadores/productos-pedro.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'saray-lama', name: 'Saray Lama Estilistas', logo: '/images/patrocinadores/saray-lama.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'todo-mueble', name: 'Todo Mueble · Rafael Bonilla León', logo: '/images/patrocinadores/todo-mueble.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'la-tortola', name: 'Administración de Loterías La Tórtola', logo: '/images/patrocinadores/la-tortola.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'twins-and-shout', name: 'Twins & Shout · School of English', logo: '/images/patrocinadores/twins-and-shout.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'vicarg', name: 'Vicarg Diseño Integral', logo: '/images/patrocinadores/vicarg.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'am-merceria', name: 'A&M Mercería', logo: '/images/patrocinadores/am-merceria.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'angel-jimenez', name: 'Pinturas y Decoración Ángel Jiménez', logo: '/images/patrocinadores/angel-jimenez.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'beatriz-olmedo', name: 'Beatriz Olmedo · Maquilladora profesional', logo: '/images/patrocinadores/beatriz-olmedo.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'bodegas-mencianas', name: 'Bodegas Mencianas', logo: '/images/patrocinadores/bodegas-mencianas.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'carniceria-jose', name: 'Carnicería Charcutería Jose', logo: '/images/patrocinadores/carniceria-jose.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'cafeteria-bar-chirama', name: 'Cafetería Bar Chirama', logo: '/images/patrocinadores/cafeteria-bar-chirama.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'crismona', name: 'Crismona', logo: '/images/patrocinadores/crismona.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'nono-y-urbano', name: 'Nono y Urbano · Pintura decorativa', logo: '/images/patrocinadores/nono-y-urbano.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'bar-carriles', name: 'Bar Carriles', logo: '/images/patrocinadores/bar-carriles.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'fenienergia', name: 'Feníe Energía · Juan Carlos López Muñoz', logo: '/images/patrocinadores/fenienergia.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'gae-mencia', name: 'GAE Mencía', logo: '/images/patrocinadores/gae-mencia.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'gomez-y-barba', name: 'Gómez & Barba C.B.', logo: '/images/patrocinadores/gomez-y-barba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'isabel-cordoba', name: 'Isabel Córdoba · Podología', logo: '/images/patrocinadores/isabel-cordoba.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'la-cantina', name: 'Mesón Restaurante La Cantina', logo: '/images/patrocinadores/la-cantina.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'la-ronda', name: 'La Ronda · Cervecería y cafetería', logo: '/images/patrocinadores/la-ronda.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'munoz', name: 'Muñoz', logo: '/images/patrocinadores/munoz.webp', logoBackground: 'dark', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'pasteleria-cubero', name: 'Pastelería Cubero', logo: '/images/patrocinadores/pasteleria-cubero.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'taberna-las-penuelas', name: 'Taberna de las Peñuelas', logo: '/images/patrocinadores/taberna-las-penuelas.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'pilar-jimenez', name: 'Pilar Jiménez · Imagen y belleza', logo: '/images/patrocinadores/pilar-jimenez.webp', kind: 'sponsor', tier: 'colaborador', status: 'confirmed' },
  { id: 'junta-de-andalucia', name: 'Junta de Andalucía', logo: '/images/patrocinadores/junta-de-andalucia.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'ayuntamiento-dona-mencia', name: 'Ayuntamiento de Doña Mencía', logo: '/images/patrocinadores/ayuntamiento-dona-mencia.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'diputacion-de-cordoba', name: 'Diputación de Córdoba', logo: '/images/patrocinadores/diputacion-de-cordoba.png', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
  { id: 'deportes-dona-mencia', name: 'Deportes Doña Mencía', logo: '/images/patrocinadores/deportes-dona-mencia.png', logoBackground: 'dark', kind: 'institutional', tier: 'colaborador', status: 'confirmed' },
];
export const principalSponsors = sponsors.filter((sponsor) => sponsor.kind === 'sponsor' && sponsor.tier === 'principal');
export const otherSponsors = sponsors.filter((sponsor) => sponsor.kind === 'sponsor' && sponsor.tier === 'colaborador');
export const institutionalPartners = sponsors.filter((sponsor) => sponsor.kind === 'institutional');

export const upcomingMatches = matches
  .filter((match) => match.status === 'scheduled')
  .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

export const recentResults = matches
  .filter((match) => match.status === 'finished')
  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
