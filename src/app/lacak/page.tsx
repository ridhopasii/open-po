import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { OrderTracker } from "@/components/order-tracker";

export const metadata: Metadata = {
  title: "Lacak Pesanan PO Kampus · OpenPO",
  description: "Cek status real-time pesanan pre-order kampusmu, jadwal pengambilan di selasar, dan kontak penjual.",
};

export default function TrackPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="track-page-main">
        <Suspense fallback={<div className="tracker-loading">Memuat pelacak pesanan…</div>}>
          <OrderTracker />
        </Suspense>
      </main>
    </div>
  );
}
