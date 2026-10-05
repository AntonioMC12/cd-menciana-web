import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './worker-env';
import { GET } from '../worker/media/[id]/[size]';

beforeEach(() => { for (const key of Object.keys(env)) delete env[key]; });
function storage(published: boolean, cover = false, objectExists = true) {
  const get = vi.fn(async () => objectExists ? { body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); controller.close(); } }) } : null);
  env.PHOTOS = { get };
  env.DB = { prepare: (sql: string) => ({ bind: () => ({ first: async () => sql.includes('FROM photos') ? { id: 'photo-id', album_id: 'album-id', published_position: published ? 0 : null, image_key: 'web-key', thumb_key: 'thumb-key' } : sql.includes('FROM albums') ? (published ? { id: 'album-id' } : null) : (cover ? { id: 'post-id' } : null) }) }) };
  return get;
}
const request = (size: string) => GET({ params: { id: 'photo-id', size } } as never);
describe('public gallery media downloads', () => {
  it('downloads the best stored version with attachment headers', async () => {
    const get = storage(true);
    const response = await request('download');
    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith('web-key');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="cd-menciana-photo-id.webp"');
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
  it('does not expose draft or withdrawn photographs', async () => {
    const get = storage(false);
    expect((await request('download')).status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
  it('keeps the existing published news cover permission', async () => {
    storage(false, true);
    expect((await request('download')).status).toBe(200);
  });
  it('handles missing objects and rejects arbitrary variants', async () => {
    const get = storage(true, false, false);
    expect((await request('download')).status).toBe(404);
    get.mockClear();
    expect((await request('https://example.com/private')).status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
});
