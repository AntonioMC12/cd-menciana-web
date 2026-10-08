import { env } from 'cloudflare:workers';
import { chooseFeatured, videoIdPattern, type TvSnapshot, type TvVideo } from '../src/lib/youtube';

interface YoutubeItem {
  id: string | { videoId?: string };
  snippet?: { title?: string; channelId?: string; publishedAt?: string; liveBroadcastContent?: string; resourceId?: { videoId?: string } };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  status?: { embeddable?: boolean; privacyStatus?: string };
  liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string; scheduledStartTime?: string };
}
interface YoutubeResult { items?: YoutubeItem[] }
// Configuration is read only on the server. No API key enters the public payload or cache key.
export function tvConfig() {
  const channelId = typeof env.YOUTUBE_CHANNEL_ID === 'string' ? env.YOUTUBE_CHANNEL_ID.trim() : '';
  const key = typeof env.YOUTUBE_API_KEY === 'string' ? env.YOUTUBE_API_KEY : '';
  const featuredId = typeof env.YOUTUBE_FEATURED_VIDEO_ID === 'string' && videoIdPattern.test(env.YOUTUBE_FEATURED_VIDEO_ID) ? env.YOUTUBE_FEATURED_VIDEO_ID : '';
  return { channelId, key, featuredId, discovery: env.YOUTUBE_LIVE_DISCOVERY === '1' };
}
async function query(resource: string, params: Record<string, string>, key: string, ttl: number): Promise<YoutubeResult> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  const cache = await caches.open('cdm-tv-v1');
  const cacheRequest = new Request(url);
  const hit = await cache.match(cacheRequest);
  if (hit) return hit.json();
  // Short negative caching also prevents repeated quota failures on every visit.
  const blocked = await cache.match(new Request(`${url}&failure=1`));
  if (blocked) throw new Error('YouTube temporalmente no disponible');
  url.searchParams.set('key', key);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('YouTube no disponible');
    const data = await response.json() as YoutubeResult;
    await cache.put(cacheRequest, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` } }));
    return data;
  } catch {
    await cache.put(new Request(`${cacheRequest.url}&failure=1`), new Response('{}', { headers: { 'cache-control': 'public, max-age=60' } }));
    throw new Error('YouTube no disponible');
  }
}
export async function getTvSnapshot(): Promise<TvSnapshot> {
  const config = tvConfig();
  const channelUrl = /^UC[A-Za-z0-9_-]{22}$/.test(config.channelId) ? `https://www.youtube.com/channel/${config.channelId}` : null;
  const empty: TvSnapshot = { status: 'unconfigured', channelUrl, videos: [], featured: null, liveDiscovery: false };
  if (!channelUrl) return empty;
  if (!config.key) {
    const featured = config.featuredId ? { id: config.featuredId, title: 'Vídeo destacado del club', publishedAt: '', state: 'video' as const, embeddable: true } : null;
    return { ...empty, featured };
  }
  try {
    const channel = await query('channels', { part: 'contentDetails', id: config.channelId }, config.key, 86400);
    const playlist = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlist) throw new Error('Canal no disponible');
    const uploads = await query('playlistItems', { part: 'snippet', playlistId: playlist, maxResults: '12' }, config.key, 300);
    const ids = uploads.items?.map(item => item.snippet?.resourceId?.videoId).filter((id): id is string => !!id && videoIdPattern.test(id)) || [];
    let liveDiscovery = false;
    if (config.discovery) {
      const results = await Promise.allSettled(['live', 'upcoming'].map(eventType => query('search', { part: 'snippet', channelId: config.channelId, type: 'video', eventType, maxResults: '10' }, config.key, 3600)));
      liveDiscovery = results.every(result => result.status === 'fulfilled');
      for (const result of results) if (result.status === 'fulfilled') for (const item of result.value.items || []) {
        if (typeof item.id === 'object' && item.id.videoId && videoIdPattern.test(item.id.videoId)) ids.push(item.id.videoId);
      }
    }
    if (config.featuredId) ids.push(config.featuredId);
    const uniqueIds = [...new Set(ids)].slice(0, 50);
    const details = uniqueIds.length ? await query('videos', { part: 'snippet,status,liveStreamingDetails', id: uniqueIds.join(',') }, config.key, 300) : { items: [] };
    const videos: TvVideo[] = [];
    for (const item of details.items || []) {
      if (typeof item.id !== 'string' || !videoIdPattern.test(item.id) || item.snippet?.channelId !== config.channelId || item.status?.privacyStatus !== 'public') continue;
      const live = item.liveStreamingDetails;
      const state = live?.actualEndTime ? 'completed' : item.snippet.liveBroadcastContent === 'live' ? 'live' : item.snippet.liveBroadcastContent === 'upcoming' ? 'upcoming' : 'video';
      videos.push({ id: item.id, title: item.snippet.title || 'Vídeo del club', publishedAt: item.snippet.publishedAt || '', scheduledAt: live?.scheduledStartTime, state, embeddable: item.status.embeddable === true });
    }
    return { status: 'ready', channelUrl, videos, featured: chooseFeatured(videos, config.featuredId), updatedAt: new Date().toISOString(), liveDiscovery };
  } catch {
    return { ...empty, status: 'error' };
  }
}
export async function tvResponse(): Promise<Response> {
  const snapshot = await getTvSnapshot();
  return new Response(JSON.stringify(snapshot), { status: snapshot.status === 'error' ? 503 : 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
