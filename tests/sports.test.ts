import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStandings, parseTeamMatch } from '../worker/sports';

const fixtureRows = Array.from({ length: 16 }, (_, index) => {
  const team = index === 6 ? 'C.D. APAGA Y VAMONOS RAVI OBRAS &amp; SERVICIOS' : `EQUIPO ${index + 1}`;
  return `<tr><td>&nbsp;</td><td>${index + 1}</td><td><div class="novanet-classification-team"><span>${team}</span></div></td><td>7</td><td>4</td><td>2</td><td>1</td><td>1</td><td>13</td><td>16</td></tr>`;
}).join('');

describe('RFAF sports parser', () => {
  it('reads the published standing order and finds the first team', () => {
    const rows = parseStandings(`<table class="novanet-classification-table"><tbody>${fixtureRows}</tbody></table>`);
    expect(rows).toHaveLength(16);
    expect(rows[6]).toMatchObject({ position: 7, team: 'CD Menciana', points: 7, played: 4, isFirstTeam: true });
  });

  it('reads one official match without treating a pending kickoff as a played result', () => {
    const html = `<article class="novanet-match-row hidden"><span class="min-w-0 truncate text-xs">C.D. APAGA Y VAMONOS RAVI OBRAS &amp; SERVICIOS</span><div class="novanet-score-value text-base">-</div><span class="font-semibold text-slate-900">Fecha:</span> 10/10/2026<div><span class="font-semibold text-slate-900">Hora:</span> Pendiente</div><div><span class="font-semibold text-slate-900">Lugar:</span> Doña Mencía - PABELLON MUNICIPAL</div><div><span class="font-semibold text-slate-900">Estado:</span> Sin jugar</div><span class="min-w-0 truncate text-xs">CIRCULO MERCANTIL E INDUSTRIAL</span></article>`;
    expect(parseTeamMatch(html, 5)).toMatchObject({ id: '2026-27-j5', homeTeam: 'CD Menciana', awayTeam: 'Círculo Mercantil e Industrial', date: '2026-10-10', status: 'scheduled' });
    expect(parseTeamMatch(html.replace('>-</div>', '>5-3</div>').replace('Sin jugar', 'Jugado'), 5)).toMatchObject({ homeScore: 5, awayScore: 3, status: 'finished' });
  });

  it('rejects an incomplete classification so the saved snapshot can be retained', () => {
    expect(() => parseStandings('<table class="novanet-classification-table"><tbody><tr><td>1</td></tr></tbody></table>')).toThrow();
  });

  it.skipIf(!existsSync(fileURLToPath(new URL('../tmp/rfaf-stars-andaluza.html', import.meta.url))))('reads the captured public RFAF pages', () => {
    const classification = readFileSync(fileURLToPath(new URL('../tmp/rfaf-stars-andaluza.html', import.meta.url)), 'utf8');
    expect(parseStandings(classification)).toHaveLength(16);
    for (let round = 1; round <= 7; round++) {
      const page = readFileSync(fileURLToPath(new URL(`../tmp/rfaf-j${round}.html`, import.meta.url)), 'utf8');
      expect(parseTeamMatch(page, round)?.id).toBe(`2026-27-j${round}`);
    }
  });
});
