import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "openpo_order_access_";
const ACCESS_TTL_SECONDS = 12 * 60 * 60;

function signingKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function getOrderAccessCookieName(orderCode: string) {
  const safeCode = orderCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return `${COOKIE_PREFIX}${safeCode}`;
}

export function createOrderAccessToken(orderId: string, orderCode: string) {
  const key = signingKey();
  if (!key) throw new Error("Order access signing key is not configured.");

  const payload = Buffer.from(
    JSON.stringify({ id: orderId, code: orderCode.toUpperCase(), exp: Date.now() + ACCESS_TTL_SECONDS * 1000 }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOrderAccessToken(token: string | undefined, orderCode: string) {
  const key = signingKey();
  if (!token || !key) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expected = crypto.createHmac("sha256", key).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: string;
      code?: string;
      exp?: number;
    };
    return Boolean(
      claims.id &&
        claims.code === orderCode.toUpperCase() &&
        typeof claims.exp === "number" &&
        claims.exp > Date.now(),
    );
  } catch {
    return false;
  }
}

export async function hasOrderAccess(orderCode: string) {
  const cookieStore = await cookies();
  return verifyOrderAccessToken(
    cookieStore.get(getOrderAccessCookieName(orderCode))?.value,
    orderCode,
  );
}

export const orderAccessCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_TTL_SECONDS,
};

export function getPaymentProofObjectPath(value: string | null | undefined) {
  if (!value) return null;
  const marker = "/storage/v1/object/public/po-payment-proofs/";
  const legacyIndex = value.indexOf(marker);
  if (legacyIndex >= 0) return decodeURIComponent(value.slice(legacyIndex + marker.length));
  return value.startsWith("http://") || value.startsWith("https://") ? null : value;
}
