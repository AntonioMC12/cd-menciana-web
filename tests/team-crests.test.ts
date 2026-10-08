import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import calendars from '../src/data/season-calendars.json';
import { getTeamCrest } from '../src/data/team-crests';
import { firstTeamMatches } from '../src/data/first-team';

describe('official team crests', () => {
  it('covers every team in every published season calendar with an existing image', () => {
    const teams = new Set(Object.values(calendars).flatMap(calendar => calendar.matches.flatMap(match => [match.homeTeam, match.awayTeam])));
    for (const team of teams) {
      const crest = getTeamCrest(team);
      expect(crest, team).toBeDefined();
      expect(existsSync(`public${crest}`), team).toBe(true);
      const image = readFileSync(`public${crest}`);
      expect(image.length, team).toBeGreaterThan(100);
      // Some existing RFAF URLs have a PNG extension but contain a JPEG.
      if (!crest?.endsWith('.svg')) expect(image.subarray(0, 2).toString('hex') === 'ffd8' || image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', team).toBe(true);
    }
  });
  it('includes crests for both sides of every static first-team match', () => {
    for (const match of firstTeamMatches) {
      expect(match.homeLogo, match.homeTeam).toBeDefined();
      expect(match.awayLogo, match.awayTeam).toBeDefined();
    }
  });
  it('resolves punctuation, sponsor names and category suffixes without guessing unknown teams', () => {
    expect(getTeamCrest('HAMAR CLUB DEPORTIVO GSPORT CIUDAD INMOBILIARIA')).toBe(getTeamCrest('Hamar CD GSport Ciudad Inmobiliaria'));
    expect(getTeamCrest('C.D. ARAS FUTSAL "A"')).toBe(getTeamCrest('CD Aras Futsala'));
    expect(getTeamCrest('C. D. FÚTBOL SALA LUQUE')).toBe(getTeamCrest('CD Futbol Sala Luque'));
    expect(getTeamCrest('Equipo desconocido')).toBeUndefined();
  });
});
