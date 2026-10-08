export type VideoState = 'live' | 'upcoming' | 'completed' | 'video';
export interface TvVideo { id: string; title: string; publishedAt: string; scheduledAt?: string; state: VideoState; embeddable: boolean }
export interface TvSnapshot { status: 'ready' | 'unconfigured' | 'error'; channelUrl: string | null; videos: TvVideo[]; featured: TvVideo | null; updatedAt?: string; liveDiscovery: boolean }
export const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
export const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export function chooseFeatured(videos: TvVideo[], preferred?: string): TvVideo | null {
  return videos.find(v => v.state === 'live') || videos.filter(v => v.state === 'upcoming').sort((a, b) => (a.scheduledAt || '9999').localeCompare(b.scheduledAt || '9999'))[0]
    || videos.find(v => v.id === preferred) || [...videos].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] || null;
}
