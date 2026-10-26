/**
 * Distributed rate limiter untuk OpenPO (Serverless Vercel ready).
 * 
 * Strategi:
 * 1. Jika UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN ada: gunakan Upstash REST API.
 * 2. Jika createAdminClient() aktif: panggil Supabase RPC hit_po_rate_limit().
 * 3. Fallback aman ke in-memory sliding window Map.
 */

import { createAdminClient } from "@/lib/supabase/admin";

type Window = { count: number; resetAt: number };

const inMemoryStore = new Map<string, Window>();

// Bersihkan entry in-memory yang expired setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of inMemoryStore) {
      if (win.resetAt < now) inMemoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * In-memory fallback rate limiter
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = inMemoryStore.get(identifier);

  if (!existing || existing.resetAt < now) {
    inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
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
 * Distributed rate limiter untuk route handler (Vercel Serverless).
 */
export async function checkRateLimitDistributed(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis REST
  if (redisUrl && redisToken) {
    try {
      const redisKey = `po_rl:${identifier}`;
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSec],
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result || 1);
        if (count > limit) {
          return { ok: false, retryAfterSeconds: windowSec };
        }
        return { ok: true };
      }
    } catch {
      // lanjut ke Supabase
    }
  }

  // 2. Supabase atomic RPC
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin.rpc("hit_po_rate_limit", {
        p_key: identifier,
        p_window_seconds: windowSec,
      });

      if (!error && typeof data === "number") {
        if (data > limit) {
          return { ok: false, retryAfterSeconds: windowSec };
        }
        return { ok: true };
      }
    }
  } catch {
    // lanjut ke fallback
  }

  // 3. Fallback ke in-memory
  return checkRateLimit(identifier, limit, windowMs);
}

/**
 * Ambil IP client dari request
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}
