/**
 * Simple sliding-window rate limiter menggunakan in-memory Map.
 *
 * ⚠️  Catatan untuk production:
 * Serverless functions (Vercel) bisa spawning multiple instances, sehingga
 * in-memory state tidak shared antar instance. Untuk production yang serius,
 * ganti dengan Vercel KV (Redis) atau Upstash.
 *
 * Untuk skala kampus (traffic rendah-sedang), solusi ini sudah cukup baik.
 */

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

// Bersihkan entry yang expired setiap 5 menit agar tidak memory leak
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, win] of store) {
        if (win.resetAt < now) store.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Periksa apakah `identifier` masih dalam batas.
 * @param identifier  IP address atau user ID
 * @param limit       Jumlah request maksimal per window
 * @param windowMs    Durasi window dalam milidetik
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || existing.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Ambil identifier dari request: gunakan IP jika ada, fallback ke "anonymous".
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}
