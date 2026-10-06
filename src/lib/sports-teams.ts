import type { Match } from '../data/types';
import { competitiveTeamIds, teamCompetitions, type CompetitiveTeamId } from '../data/team-competitions';

const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const legacyNames = ['CD Menciana', 'CD Apaga y Vámonos', 'CD Menciana Centro Cicloturista Subbética', 'RAVI Obras & Servicios Apaga y Vámonos'].map(normalize);

export const isClubTeam = (name: string): boolean => legacyNames.includes(normalize(name)) ||
  competitiveTeamIds.some(id => normalize(name) === normalize(teamCompetitions[id].officialName));

// Older API snapshots used the same club name for every category.
export const competitionMatch = (match: Match, teamId: CompetitiveTeamId): Match => ({
  ...match,
  homeTeam: isClubTeam(match.homeTeam) ? teamCompetitions[teamId].officialName : match.homeTeam,
  awayTeam: isClubTeam(match.awayTeam) ? teamCompetitions[teamId].officialName : match.awayTeam,
});
