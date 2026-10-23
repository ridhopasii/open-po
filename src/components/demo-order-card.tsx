"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRupiah } from "@/lib/marketplace-shared";

export function DemoOrderCard({
  batchName,
  price,
  remaining,
}: {
  batchName: string;
  price: number;
  remaining: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [simulated, setSimulated] = useState(false);

  const total = quantity * price;

  function handleSimulate() {
    setSimulated(true);
  }

  return (
    <div className="demo-order-wrapper">
      <div className="demo-badge-banner">
        <span className="demo-tag">Mode Contoh</span>
        <span>Pratinjau tampilan PO</span>
      </div>

      <div className="demo-order-stepper">
        <label className="demo-order-label">
          <span>Jumlah pesanan</span>
          <span className="demo-quota-hint">Maksimal {remaining} item</span>
        </label>
        <div className="quantity-counter">
          <button
            type="button"
            className="counter-btn"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Kurangi jumlah"
          >
            −
          </button>
          <span className="counter-val">{quantity}</span>
          <button
            type="button"
            className="counter-btn"
            onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
            disabled={quantity >= remaining}
            aria-label="Tambah jumlah"
          >
            +
          </button>
        </div>
      </div>

      <div className="demo-summary-row">
        <span>Total ({quantity} item)</span>
        <strong>{formatRupiah(total)}</strong>
      </div>

      {simulated ? (
        <div className="demo-success-box">
          <div className="demo-success-icon">✓</div>
          <strong>Simulasi berhasil!</strong>
          <p>
            Di OpenPO yang sebenarnya, pesananmu untuk &quot;{batchName}&quot; akan langsung masuk ke dashboard penjual dan tersimpan di akunmu.
          </p>
          <div className="demo-success-actions">
            <Link href="/penjual" className="button button-small">
              Buka PO Jualanmu →
            </Link>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setSimulated(false)}
            >
              Coba lagi
            </button>
          </div>
        </div>
      ) : (
        <div className="demo-card-actions">
          <button
            type="button"
            className="button"
            onClick={handleSimulate}
          >
            Coba simulasi pesan
          </button>
          <p className="demo-note-text">
            Ingin jualan makanan/barang seperti ini di kampus?
          </p>
          <Link href="/penjual" className="button button-outline">
            Daftar jadi Penjual →
          </Link>
        </div>
      )}
    </div>
  );
}
