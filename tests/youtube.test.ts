import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './worker-env';
import { chooseFeatured, type TvVideo } from '../src/lib/youtube';
import { getTvSnapshot, tvResponse } from '../worker/youtube';
const channel = `UC${'a'.repeat(22)}`;
const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd'];
const video = (index: number, state: TvVideo['state']): TvVideo => ({ id: ids[index], title: 'Partido', publishedAt: '2026-10-01', state, embeddable: true });
let storage: Map<string, Response>;
beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  storage = new Map();
  vi.stubGlobal('caches', { open: async () => ({ match: async (request: Request) => storage.get(request.url)?.clone(), put: async (request: Request, response: Response) => { storage.set(request.url, response.clone()); } }) });
});
afterEach(() => vi.unstubAllGlobals());
function mockApi(searchFails = false) {
  const fetcher = vi.fn(async (input: URL) => {
    const resource = input.pathname.split('/').at(-1);
    if (resource === 'channels') return Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] });
    if (resource === 'playlistItems') return Response.json({ items: ids.map(id => ({ snippet: { resourceId: { videoId: id } } })) });
    if (resource === 'search') return searchFails ? new Response('', { status: 403 }) : Response.json({ items: [] });
    return Response.json({ items: ids.map((id, index) => ({ id, snippet: { channelId: channel, title: 'Partido', publishedAt: '2026-10-01', liveBroadcastContent: index === 1 ? 'live' : index === 2 ? 'upcoming' : 'none' }, status: { privacyStatus: 'public', embeddable: index !== 3 }, liveStreamingDetails: index === 3 ? { actualEndTime: '2026-10-02' } : index === 2 ? { scheduledStartTime: '2026-10-09T18:00:00Z' } : {} })) });
  });
  vi.stubGlobal('fetch', fetcher); return fetcher;
}
describe('CDM TV', () => {
  it('prioritizes confirmed live, earliest scheduled, configured ID, then latest upload', () => {
    const latest = { ...video(0, 'video'), publishedAt: '2026-10-08' };
    const soon = { ...video(2, 'upcoming'), scheduledAt: '2026-10-09' };
    const later = { ...video(3, 'upcoming'), scheduledAt: '2026-10-10' };
    expect(chooseFeatured([latest, soon, video(1, 'live')])?.state).toBe('live');
    expect(chooseFeatured([later, soon, latest])?.id).toBe(soon.id);
    expect(chooseFeatured([latest, video(3, 'video')], ids[3])?.id).toBe(ids[3]);
    expect(chooseFeatured([video(3, 'video'), latest])?.id).toBe(latest.id);
    expect(chooseFeatured([])).toBeNull();
  });
  it('does not contact YouTube with missing or invalid channel configuration', async () => {
    const fetcher = mockApi();
    expect((await getTvSnapshot()).status).toBe('unconfigured');
    env.YOUTUBE_CHANNEL_ID = 'https://youtube.com/@club';
    expect((await getTvSnapshot()).channelUrl).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('offers manual fallback without falsely identifying a broadcast or date', async () => {
    env.YOUTUBE_CHANNEL_ID = channel; env.YOUTUBE_FEATURED_VIDEO_ID = ids[0];
    const data = await getTvSnapshot();
    expect(data.featured?.state).toBe('video'); expect(data.featured?.publishedAt).toBe('');
    expect(data.liveDiscovery).toBe(false);
  });
  it('classifies confirmed states, honors embed restrictions and keeps secrets out of cache and response', async () => {
    env.YOUTUBE_CHANNEL_ID = channel; env.YOUTUBE_API_KEY = 'test-secret'; env.YOUTUBE_LIVE_DISCOVERY = '1';
    const fetcher = mockApi();
    const data = await getTvSnapshot();
    expect(data.videos.map(v => v.state)).toEqual(['video', 'live', 'upcoming', 'completed']);
    expect(data.featured?.id).toBe(ids[1]); expect(data.videos[3].embeddable).toBe(false); expect(data.liveDiscovery).toBe(true);
    expect(JSON.stringify(data)).not.toContain('test-secret');
    expect([...storage.keys()].join('')).not.toContain('test-secret');
    const calls = fetcher.mock.calls.length;
    await getTvSnapshot(); expect(fetcher.mock.calls.length).toBe(calls);
  });
  it('keeps uploads when discovery fails and does not claim complete live detection', async () => {
    env.YOUTUBE_CHANNEL_ID = channel; env.YOUTUBE_API_KEY = 'key'; env.YOUTUBE_LIVE_DISCOVERY = '1'; mockApi(true);
    const data = await getTvSnapshot(); expect(data.status).toBe('ready'); expect(data.videos.length).toBe(4); expect(data.liveDiscovery).toBe(false);
  });
  it('returns a recoverable error with a short negative cache on quota/network failure', async () => {
    env.YOUTUBE_CHANNEL_ID = channel; env.YOUTUBE_API_KEY = 'key';
    const fetcher = vi.fn(async () => new Response('', { status: 403 })); vi.stubGlobal('fetch', fetcher);
    const response = await tvResponse(); expect(response.status).toBe(503); expect((await response.json()).status).toBe('error');
    await getTvSnapshot(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('returns an empty channel and rejects videos from a different channel', async () => {
    env.YOUTUBE_CHANNEL_ID = channel; env.YOUTUBE_API_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => url.pathname.endsWith('/channels') ? Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] }) : Response.json({ items: [] })));
    expect((await getTvSnapshot()).videos).toEqual([]);
    storage.clear(); mockApi();
    env.YOUTUBE_CHANNEL_ID = `UC${'z'.repeat(22)}`;
    expect((await getTvSnapshot()).videos).toEqual([]);
  });
});
