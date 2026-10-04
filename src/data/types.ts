export type PublicationStatus = 'provisional' | 'confirmed';

export interface Team {
  id: string;
  name: string;
  category: string;
  description: string;
  season: string;
  status: PublicationStatus;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number?: number;
  position?: string;
  photo?: string;
  status: PublicationStatus;
}

export interface Match {
  id: string;
  competition: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  date?: string; // ISO 8601, including the timezone when known.
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'finished' | 'postponed';
  publication: PublicationStatus;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  publishedAt?: string; // ISO date; absent for editorial examples.
  image?: string;
  status: PublicationStatus;
}

export interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  logoBackground?: 'dark';
  website?: string;
  kind: 'sponsor' | 'institutional';
  tier: 'principal' | 'colaborador';
  status: PublicationStatus;
}
