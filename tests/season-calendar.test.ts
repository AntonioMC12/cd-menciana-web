import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSeasonCalendar, mergeSeasonMatches } from '../src/lib/season-calendar';
import calendars from '../src/data/season-calendars.json';
import { competitiveTeamIds, teamCompetitions } from '../src/data/team-competitions';
import { firstTeamMatches } from '../src/data/first-team';
import { syncSports } from '../worker/sports';
import { env } from './worker-env';
import type { Match } from '../src/data/types';

const calendarPage = () => '<h4>Temporada 2026-2027</h4>' + Array.from({length:14}, (_, index) => `<table><thead><tr><th>Jornada ${index+1} <span>(18-10-2026)</span></th></tr></thead><tbody><tr><td>C.D. MENCIANA</td><td><script>throw new Error('Do not execute');</script></td><td>${index===3||index===10?'Descansa':'C.D. RIVAL'}</td></tr></tbody></table>`).join('');

describe('official full-season calendar', () => {
  afterEach(()=>{vi.unstubAllGlobals();delete env.DB;});
  it('reads all rounds, excludes rests and labels the date as a round date without decoding score scripts', () => {
    const matches = parseSeasonCalendar(calendarPage(), 'cadete');
    expect(matches).toHaveLength(12);
    expect(matches[0]).toMatchObject({date:'2026-10-18',dateIsRound:true,publication:'provisional'});
    expect(matches[0].homeScore).toBeUndefined();
    expect(matches.map(m=>m.round)).not.toContain('Jornada 4');
  });
  it('rejects a different season or a missing round', () => {
    expect(()=>parseSeasonCalendar(calendarPage().replace('2026-2027','2025-2026'),'cadete')).toThrow('Temporada');
    expect(()=>parseSeasonCalendar(calendarPage().replace('Jornada 14','Jornada 15'),'cadete')).toThrow('Jornadas');
  });
  it('keeps the actual Saturday and kickoff time instead of the generic Sunday round date', () => {
    const match=calendars['primer-equipo'].matches[4] as Match;
    const detail={...match,date:'2026-10-10T19:00:00',dateIsRound:undefined,publication:'confirmed' as const};
    expect(mergeSeasonMatches([match],[detail])[0]).toMatchObject({date:'2026-10-10T19:00:00',dateIsRound:false});
    expect(mergeSeasonMatches([match],[{...detail,awayTeam:'A DIFFERENT RIVAL'}])[0]).toEqual(match);
  });
  it('preserves the four verified first-team results in the static fallback', () => {
    expect(firstTeamMatches.filter(m=>m.status==='finished')).toHaveLength(4);
    expect(firstTeamMatches).toHaveLength(30);
    expect(firstTeamMatches[1].dateIsRound).toBe(false);
  });
  it.each(competitiveTeamIds)('has a dated official full calendar for %s', id => {
    const data=calendars[id];
    expect(data.sourceUrl).toContain('codcompeticion='+teamCompetitions[id].competition);
    expect(new Set(data.matches.map(m=>m.id)).size).toBe(data.matches.length);
    expect(data.matches.at(-1)?.date).toMatch(/^2027-/);
    expect(data.matches.every(m=>m.dateIsRound && !('homeScore' in m))).toBe(true);
  });
  it('uses the verified complete calendar and keeps saved results when both live sources are unavailable', async () => {
    const previous={updatedAt:'2026-10-06T13:00:00Z',matches:firstTeamMatches.filter(m=>m.status==='finished'),standings:[]};
    const run=vi.fn().mockResolvedValue({success:true});
    const bind=vi.fn().mockReturnValue({first:vi.fn().mockResolvedValue({payload_json:JSON.stringify(previous)}),run});
    env.DB={prepare:vi.fn().mockReturnValue({bind})};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('No se ha aceptado el cookie')));
    const saved=await syncSports();
    expect(saved.matches).toHaveLength(30);
    expect(saved.matches.filter(m=>m.status==='finished')).toHaveLength(4);
    expect(saved.calendarCheckedAt).toBe(calendars['primer-equipo'].verifiedAt);
    expect(saved.standingsUpdatedAt).toBe(previous.updatedAt);
    expect(run).toHaveBeenCalledOnce();
  });
});
