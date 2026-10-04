import type { Match } from './types';

// Build-time fallback checked against the RFAF Novanet widget on 2026-10-04.
// The Worker refreshes the published results and standings automatically.
// Opponent crests in /public/images/equipos/ were downloaded from these match cards.
export const firstTeamSource = {
  checkedOn: '4 de octubre de 2026',
  resultsUrl: 'https://stars.rfaf.es/?delegacion=9&competicion=48466108&grupo=48466109&widget_view=results',
  standingsUrl: 'https://stars.rfaf.es/?delegacion=9&competicion=48466108&grupo=48466109&widget_view=classification',
};

const club = 'CD Menciana';
const competition = '3.ª División F.S. · Grupo 17';

export const firstTeamMatches: Match[] = [
  { id: '2026-27-j1', competition, round: 'Jornada 1', homeTeam: club, awayTeam: 'CD La Palma F.S.', awayLogo: '/images/equipos/la-palma.jpg', date: '2026-09-12T18:30:00+02:00', venue: 'PMD Alcalde Julio Priego · Doña Mencía', homeScore: 5, awayScore: 3, status: 'finished', publication: 'confirmed' },
  { id: '2026-27-j2', competition, round: 'Jornada 2', homeTeam: 'Hamar CD GSport Ciudad Inmobiliaria', homeLogo: '/images/equipos/hamar-bormujos.jpg', awayTeam: club, date: '2026-09-20T12:00:00+02:00', venue: 'Pabellón Juan Manuel Acevedo · Bormujos', homeScore: 2, awayScore: 2, status: 'finished', publication: 'confirmed' },
  { id: '2026-27-j3', competition, round: 'Jornada 3', homeTeam: club, awayTeam: 'CD Santaella 2010', awayLogo: '/images/equipos/santaella.jpg', date: '2026-09-27T12:30:00+02:00', venue: 'PMD Alcalde Julio Priego · Doña Mencía', homeScore: 2, awayScore: 0, status: 'finished', publication: 'confirmed' },
  { id: '2026-27-j4', competition, round: 'Jornada 4', homeTeam: 'CD Córdoba Futsal Patrimonio', homeLogo: '/images/equipos/cordoba-futsal.jpg', awayTeam: club, date: '2026-10-04T13:30:00+02:00', venue: 'Pabellón Vista Alegre · Córdoba', homeScore: 11, awayScore: 4, status: 'finished', publication: 'confirmed' },
  { id: '2026-27-j5', competition, round: 'Jornada 5', homeTeam: club, awayTeam: 'Círculo Mercantil e Industrial', awayLogo: '/images/equipos/circulo-mercantil.jpg', date: '2026-10-10', venue: 'PMD Alcalde Julio Priego · Doña Mencía', status: 'scheduled', publication: 'confirmed' },
  { id: '2026-27-j6', competition, round: 'Jornada 6', homeTeam: 'CD Benalup', homeLogo: '/images/equipos/benalup.jpg', awayTeam: club, date: '2026-10-18', venue: 'Pabellón Municipal 28 de Febrero · Benalup-Casas Viejas', status: 'scheduled', publication: 'confirmed' },
  { id: '2026-27-j7', competition, round: 'Jornada 7', homeTeam: club, awayTeam: 'CD Unión Deportiva Los Amigos', awayLogo: '/images/equipos/union-los-amigos.jpg', date: '2026-10-25', venue: 'PMD Alcalde Julio Priego · Doña Mencía', status: 'scheduled', publication: 'confirmed' },
];

export interface StandingRow {
  position: number;
  team: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  isFirstTeam?: boolean;
  isClub?: boolean;
}

// Preserve RFAF's published order, including any disciplinary adjustments.
export const firstTeamStandings: StandingRow[] = [
  { position: 1, team: 'UD Alchoyano', points: 9, played: 4, won: 3, drawn: 0, lost: 1, goalsFor: 21, goalsAgainst: 11 },
  { position: 2, team: 'CD Olimpic de Triana', points: 9, played: 4, won: 3, drawn: 0, lost: 1, goalsFor: 16, goalsAgainst: 11 },
  { position: 3, team: 'CD Décorseneca', points: 8, played: 4, won: 2, drawn: 2, lost: 0, goalsFor: 16, goalsAgainst: 9 },
  { position: 4, team: 'CD Cádiz Futsal You Asesoría', points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 18, goalsAgainst: 14 },
  { position: 5, team: 'Hamar CD GSport Ciudad Inmobiliaria', points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 14, goalsAgainst: 11 },
  { position: 6, team: 'CD Isleño San Fernando F.S.', points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 11, goalsAgainst: 12 },
  { position: 7, team: 'RAVI Obras & Servicios Apaga y Vámonos', points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 13, goalsAgainst: 16, isFirstTeam: true },
  { position: 8, team: 'CD Alcalá de Guadaíra F.S.', points: 5, played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 13, goalsAgainst: 11 },
  { position: 9, team: 'CD Deporte y Ocio (ADYO)', points: 6, played: 4, won: 2, drawn: 0, lost: 2, goalsFor: 16, goalsAgainst: 12 },
  { position: 10, team: 'CD Benalup', points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 11, goalsAgainst: 11 },
  { position: 11, team: 'CD Santaella 2010', points: 5, played: 4, won: 1, drawn: 2, lost: 1, goalsFor: 12, goalsAgainst: 13 },
  { position: 12, team: 'CD Unión Deportiva Los Amigos', points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 17, goalsAgainst: 19 },
  { position: 13, team: 'Círculo Mercantil e Industrial', points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 10, goalsAgainst: 12 },
  { position: 14, team: 'CD Córdoba Futsal Patrimonio', points: 3, played: 4, won: 1, drawn: 0, lost: 3, goalsFor: 23, goalsAgainst: 23 },
  { position: 15, team: 'CD La Palma F.S.', points: 1, played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 15, goalsAgainst: 22 },
  { position: 16, team: 'CD Villalba F.S.', points: 0, played: 4, won: 0, drawn: 0, lost: 4, goalsFor: 10, goalsAgainst: 29 },
];
