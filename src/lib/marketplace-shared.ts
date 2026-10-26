export type OpenBatch = {
  id: string; title: string; quota: number; reserved_quantity: number; closes_at: string; pickup_at: string; pickup_point: string; pickup_note: string;
  status?: string;
  product: { id: string; name: string; description: string; category: string; price_idr: number; seller: { display_name: string; faculty: string; avatar_path?: string | null } };
  photo?: string;
  is_sample?: boolean;
};

export function getSellerAvatarUrl(path?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl || !path) return null;
  const safePath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/po-seller-avatars/${safePath}`;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function formatCampusDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...options }).format(new Date(value));
}
