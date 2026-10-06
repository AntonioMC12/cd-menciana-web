export type CompetitiveTeamId = 'primer-equipo' | 'filial' | 'cadete' | 'infantil';

export type TeamCompetition = {
  id: CompetitiveTeamId;
  label: string;
  category: string;
  officialName: string;
  teamNeedle: string;
  delegation: number;
  competition: number;
  group: number;
  rounds: number;
  rfafTeamUrl?: string;
};

export const teamCompetitions: Record<CompetitiveTeamId, TeamCompetition> = {
  'primer-equipo': {
    id: 'primer-equipo', label: 'Primer equipo', category: '3.ª División F.S. · Grupo 17',
    officialName: 'C.D. APAGA Y VAMONOS RAVI OBRAS & SERVICIOS',
    teamNeedle: 'APAGA Y VAMONOS RAVI OBRAS', delegation: 9, competition: 48466108, group: 48466109, rounds: 30,
    rfafTeamUrl: 'https://www.rfaf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=2137495',
  },
  filial: {
    id: 'filial', label: 'Filial', category: '2.ª Andaluza Sénior F.S. · Grupo A',
    officialName: 'C.D. APAGA Y VAMONOS',
    teamNeedle: 'C.D. APAGA Y VAMONOS', delegation: 4, competition: 49113015, group: 49113036, rounds: 14,
    rfafTeamUrl: 'https://www.rfaf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=48536795',
  },
  cadete: {
    id: 'cadete', label: 'Cadete', category: '2.ª Andaluza Cadete F.S. · Grupo A',
    officialName: 'C.D. MENCIANA',
    teamNeedle: 'C.D. MENCIANA', delegation: 4, competition: 49465203, group: 49465413, rounds: 14,
    rfafTeamUrl: 'https://www.rfaf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=485016',
  },
  infantil: {
    id: 'infantil', label: 'Infantil Centro Cicloturista Subbética', category: '2.ª Andaluza Infantil F.S. · Grupo B',
    officialName: 'C.D. MENCIANA CENTRO CICLOTURISTA SUBBETICA',
    teamNeedle: 'C.D. MENCIANA CENTRO CICLOTURISTA SUBBETICA', delegation: 4, competition: 49520234, group: 49520774, rounds: 18,
    rfafTeamUrl: 'https://www.rfaf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=34369965',
  },
};

export const competitiveTeamIds = Object.keys(teamCompetitions) as CompetitiveTeamId[];
export const getTeamCompetition = (id: string): TeamCompetition | null =>
  Object.hasOwn(teamCompetitions, id) ? teamCompetitions[id as CompetitiveTeamId] : null;
export const rfafWidgetUrl = (team: TeamCompetition, view: 'results' | 'classification') =>
  `https://stars.rfaf.es/?delegacion=${team.delegation}&competicion=${team.competition}&grupo=${team.group}&widget_view=${view}`;
export const rfafCalendarUrl = (team: TeamCompetition) =>
  `https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=${team.competition}&codgrupo=${team.group}&CodJornada=`;
