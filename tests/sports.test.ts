import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStandings, parseTeamMatch } from '../worker/sports';
import { teamCompetitions, competitiveTeamIds } from '../src/data/team-competitions';
import { competitionMatch, isClubTeam } from '../src/lib/sports-teams';
import { firstTeamMatches } from '../src/data/first-team';

const fixtureRows = Array.from({ length: 16 }, (_, index) => {
  const team = index === 6 ? 'C.D. APAGA Y VAMONOS RAVI OBRAS &amp; SERVICIOS' : `EQUIPO ${index + 1}`;
  return `<tr><td>&nbsp;</td><td>${index + 1}</td><td><div class="novanet-classification-team"><span>${team}</span></div></td><td>7</td><td>4</td><td>2</td><td>1</td><td>1</td><td>13</td><td>16</td></tr>`;
}).join('');

describe('RFAF sports parser', () => {
  it('reads the published standing order and finds the first team', () => {
    const rows = parseStandings(`<table class="novanet-classification-table"><tbody>${fixtureRows}</tbody></table>`);
    expect(rows).toHaveLength(16);
    expect(rows[6]).toMatchObject({ position: 7, team: 'C.D. APAGA Y VAMONOS RAVI OBRAS & SERVICIOS', points: 7, played: 4, isFirstTeam: true });
  });

  it('reads one official match without treating a pending kickoff as a played result', () => {
    const html = `<article class="novanet-match-row hidden"><span class="min-w-0 truncate text-xs">C.D. APAGA Y VAMONOS RAVI OBRAS &amp; SERVICIOS</span><div class="novanet-score-value text-base">-</div><span class="font-semibold text-slate-900">Fecha:</span> 10/10/2026<div><span class="font-semibold text-slate-900">Hora:</span> Pendiente</div><div><span class="font-semibold text-slate-900">Lugar:</span> Doña Mencía - PABELLON MUNICIPAL</div><div><span class="font-semibold text-slate-900">Estado:</span> Sin jugar</div><span class="min-w-0 truncate text-xs">CIRCULO MERCANTIL E INDUSTRIAL</span></article>`;
    expect(parseTeamMatch(html, 5)).toMatchObject({ id: '2026-27-j5', homeTeam: 'C.D. APAGA Y VAMONOS RAVI OBRAS & SERVICIOS', awayTeam: 'Círculo Mercantil e Industrial', date: '2026-10-10', status: 'scheduled' });
    expect(parseTeamMatch(html.replace('>-</div>', '>5-3</div>').replace('Sin jugar', 'Jugado'), 5)).toMatchObject({ homeScore: 5, awayScore: 3, status: 'finished' });
  });

  it('rejects an incomplete classification so the saved snapshot can be retained', () => {
    expect(() => parseStandings('<table class="novanet-classification-table"><tbody><tr><td>1</td></tr></tbody></table>')).toThrow();
  });

  it('decodes a cadet rival name and skips a rest round', () => {
    const html = `<article class="novanet-match-row hidden"><span class="min-w-0 truncate text-xs">C.D. MENCIANA</span><div class="novanet-score-value text-base">12-0</div><span class="font-semibold text-slate-900">Fecha:</span> 04/10/2026<div><span class="font-semibold text-slate-900">Hora:</span> 12:00</div><div><span class="font-semibold text-slate-900">Estado:</span> Jugado</div><span class="min-w-0 truncate text-xs">C.D. ARAS FUTSAL &#039;A&#039;</span></article>`;
    expect(parseTeamMatch(html, 2, 'cadete')).toMatchObject({ homeTeam: 'C.D. MENCIANA', awayTeam: "C.D. ARAS FUTSAL 'A'", awayLogo: '/images/equipos/rfaf-4d2e99b781c3fc053cf0e77f8a9f1e6fcf23bcce.jpg' });
    expect(parseTeamMatch(html.replace('C.D. ARAS FUTSAL &#039;A&#039;', 'Descansa'), 4, 'cadete')).toBeNull();
  });

  it.skipIf(!existsSync(fileURLToPath(new URL('../tmp/rfaf-stars-andaluza.html', import.meta.url))))('reads the captured public RFAF pages', () => {
    const classification = readFileSync(fileURLToPath(new URL('../tmp/rfaf-stars-andaluza.html', import.meta.url)), 'utf8');
    expect(parseStandings(classification)).toHaveLength(16);
    for (let round = 1; round <= 7; round++) {
      const page = readFileSync(fileURLToPath(new URL(`../tmp/rfaf-j${round}.html`, import.meta.url)), 'utf8');
      expect(parseTeamMatch(page, round)?.id).toBe(`2026-27-j${round}`);
    }
  });

  it.skipIf(!existsSync(fileURLToPath(new URL('../tmp/rfaf-cadete-classification.html', import.meta.url))))('reads the three youth and reserve team groups', () => {
    for (const [teamId, round] of [['filial', 1], ['cadete', 2], ['infantil', 2]] as const) {
      const standingsPage = readFileSync(fileURLToPath(new URL(`../tmp/rfaf-${teamId}-classification.html`, import.meta.url)), 'utf8');
      const resultsPage = readFileSync(fileURLToPath(new URL(`../tmp/rfaf-${teamId}-results.html`, import.meta.url)), 'utf8');
      expect(parseStandings(standingsPage, teamId).filter(row => row.isClub)).toHaveLength(1);
      const match = parseTeamMatch(resultsPage, round, teamId);
      expect(match).toMatchObject({ id: `2026-27-${teamId}-j${round}`, status: 'finished' });
      expect([match?.homeTeam, match?.awayTeam]).toContain(teamCompetitions[teamId].officialName);
      const rivalLogo = match && isClubTeam(match.homeTeam) ? match.awayLogo : match?.homeLogo;
      expect(rivalLogo).toMatch(/^\/images\/equipos\/rfaf-/);
      expect(existsSync(fileURLToPath(new URL(`../public${rivalLogo}`, import.meta.url)))).toBe(true);
    }
  });
});

describe('competition names in existing sports snapshots', () => {
  it.each(competitiveTeamIds)('restores the official %s name at home and away without changing the rival or match details', teamId => {
    const home = { ...firstTeamMatches[4], homeTeam: 'CD Menciana' };
    const away = { ...firstTeamMatches[5], awayTeam: 'CD Menciana' };
    expect(competitionMatch(home, teamId)).toEqual({ ...home, homeTeam: teamCompetitions[teamId].officialName });
    expect(competitionMatch(away, teamId)).toEqual({ ...away, awayTeam: teamCompetitions[teamId].officialName });
    expect(isClubTeam(teamCompetitions[teamId].officialName)).toBe(true);
    expect(isClubTeam(away.homeTeam)).toBe(false);
    expect(home.homeTeam).toBe('CD Menciana');
  });
});
