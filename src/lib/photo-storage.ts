import type { R2Bucket } from '@cloudflare/workers-types';
// D1 and R2 have no shared transaction. Remove both newly written objects if D1 fails.
export async function persistObjects(bucket: Pick<R2Bucket, 'put' | 'delete'>, imageKey: string, thumbKey: string, webBytes: Uint8Array, thumbBytes: Uint8Array, saveMetadata: () => Promise<unknown>): Promise<void> {
  try {
    await bucket.put(imageKey, webBytes, { httpMetadata: { contentType: 'image/webp' } });
    await bucket.put(thumbKey, thumbBytes, { httpMetadata: { contentType: 'image/webp' } });
    await saveMetadata();
  } catch (e) {
    await Promise.allSettled([bucket.delete(imageKey), bucket.delete(thumbKey)]);
    throw e;
  }
}
