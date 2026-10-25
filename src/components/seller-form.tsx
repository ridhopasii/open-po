"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const localDateTime = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};

export type SellerDefaults = {
  display_name: string;
  faculty: string;
  whatsapp: string;
};

export type PrefillProduct = {
  name: string;
  category: string;
  price: number;
  description?: string;
};

export type CatalogProductOption = {
  id: string;
  name: string;
  category: string;
  price_idr: number;
  description: string;
};

export function SellerForm({
  seller,
  prefillProduct,
  catalogProducts,
  onBatchCreated,
}: {
  seller?: SellerDefaults | null;
  prefillProduct?: PrefillProduct | null;
  catalogProducts?: CatalogProductOption[];
  onBatchCreated?: (batchId: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const now = new Date();
  const closeDefault = new Date(now.getTime() + 2 * 86400000);
  const pickupDefault = new Date(now.getTime() + 3 * 86400000);

  // Form field states for prefill flexibility
  const [productName, setProductName] = useState(prefillProduct?.name ?? "");
  const [category, setCategory] = useState(prefillProduct?.category ?? "Makanan");
  const [price, setPrice] = useState(prefillProduct?.price ? String(prefillProduct.price) : "15000");
  const [description, setDescription] = useState(prefillProduct?.description ?? "");
  const [quota, setQuota] = useState("25");
  const [closesAt, setClosesAt] = useState(localDateTime(closeDefault));
  const [pickupAt, setPickupAt] = useState(localDateTime(pickupDefault));
  const [pickupPoint, setPickupPoint] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  // Update when prefillProduct changes
  useEffect(() => {
    if (prefillProduct) {
      setProductName(prefillProduct.name);
      setCategory(prefillProduct.category);
      setPrice(String(prefillProduct.price));
      if (prefillProduct.description) {
        setDescription(prefillProduct.description);
      }
    }
  }, [prefillProduct]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const pName = productName.trim();
      const response = await fetch("/api/seller/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sellerName: form.get("sellerName"),
          faculty: form.get("faculty"),
          whatsapp: form.get("whatsapp"),
          productName: pName,
          description: description.trim(),
          category,
          price: Number(price),
          title: `PO ${pName.slice(0, 97)}`,
          quota: Number(quota),
          closesAt: new Date(closesAt).toISOString(),
          pickupAt: new Date(pickupAt).toISOString(),
          pickupPoint: pickupPoint.trim(),
          pickupNote: pickupNote.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error ?? "PO belum berhasil dibuat. Periksa data lalu coba lagi.");
        return;
      }

      if (onBatchCreated) {
        onBatchCreated(result.id);
      } else {
        router.push(`/penjual?baru=${encodeURIComponent(result.id)}`);
        router.refresh();
      }
    } catch {
      setMessage("Koneksi terputus. PO belum terbit; coba kirim lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-stack seller-form" onSubmit={submit}>
      {prefillProduct && (
        <div className="prefill-notice-box">
          <span className="prefill-badge">✓ Terhubung dengan Katalog</span>
          <p>
            Membuka PO untuk produk: <strong>{prefillProduct.name}</strong> ({prefillProduct.category})
          </p>
        </div>
      )}

      <details className="seller-profile-details" open={!seller}>
        <summary>
          <span>
            <b>Profil & Kontak Penjual</b>
            <small>
              {seller
                ? "Data tersimpan — ubah jika ada pembaruan nomor WhatsApp atau prodi."
                : "Nama, fakultas, dan kontak WhatsApp untuk dihubungi pembeli."}
            </small>
          </span>
        </summary>
        <label>
          Nama Penjual / Nama Usaha
          <input
            name="sellerName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            defaultValue={seller?.display_name ?? ""}
            placeholder="Contoh: Nadia Putri / Dapur Mahasiswa"
          />
        </label>
        <label>
          Fakultas / Program Studi
          <input
            name="faculty"
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization-title"
            defaultValue={seller?.faculty ?? ""}
            placeholder="Contoh: Fakultas Pertanian 2023"
          />
        </label>
        <label>
          Nomor WhatsApp Aktif
          <input
            name="whatsapp"
            required
            minLength={8}
            maxLength={24}
            inputMode="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            defaultValue={seller?.whatsapp ?? ""}
          />
        </label>
      </details>

      <div className="form-section-title">
        <span>01</span>
        <div>
          <b>Detail Produk & Harga</b>
          <small>Informasi yang akan tampil di etalase pembeli se-kampus.</small>
        </div>
      </div>

      {catalogProducts && catalogProducts.length > 0 && (
        <div style={{ background: "var(--polmed-50)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--polmed-100)", marginBottom: "12px" }}>
          <label style={{ fontWeight: 700, color: "var(--polmed-900)", display: "grid", gap: "6px" }}>
            📦 Pilih dari Katalog Barangmu (Isi Otomatis)
            <select
              onChange={(e) => {
                const prod = catalogProducts.find((p) => p.id === e.target.value);
                if (prod) {
                  setProductName(prod.name);
                  setCategory(prod.category);
                  setPrice(String(prod.price_idr));
                  setDescription(prod.description || "");
                }
              }}
              defaultValue=""
              style={{ background: "#ffffff", borderColor: "var(--polmed-100)" }}
            >
              <option value="" disabled>-- Pilih produk yang pernah kamu buat --</option>
              {catalogProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category} · Rp {p.price_idr.toLocaleString("id-ID")})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label>
        Nama Produk Jualan
        <input
          name="productName"
          required
          minLength={2}
          maxLength={100}
          placeholder="Contoh: Risol Mayo Beef Melted (Isi 4)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
      </label>

      <label>
        Kategori Produk
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="Makanan">Makanan</option>
          <option value="Minuman">Minuman</option>
          <option value="Fashion">Fashion / Pakaian</option>
          <option value="Merchandise">Merchandise Kampus</option>
          <option value="Kerajinan">Kerajinan / Handmade</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </label>

      <label>
        Deskripsi Produk & Varian
        <textarea
          name="description"
          rows={3}
          maxLength={1200}
          placeholder="Jelaskan porsi, rasa, bahan halal, atau opsi varian (less sugar / pedas / ukuran XL)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="form-row">
        <label>
          Harga per Item (Rp)
          <input
            name="price"
            type="number"
            required
            min={1000}
            step={500}
            placeholder="15000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Batas Kuota Pre-Order
          <input
            name="quota"
            type="number"
            required
            min={1}
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
          />
        </label>
      </div>

      <div className="form-section-title">
        <span>02</span>
        <div>
          <b>Jadwal & Lokasi Pengambilan di Kampus</b>
          <small>Waktu serah terima harus setelah batas pemesanan ditutup.</small>
        </div>
      </div>

      <label>
        Batas Pemesanan (PO Tutup)
        <input
          name="closesAt"
          type="datetime-local"
          required
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
      </label>

      <label>
        Jadwal Pengambilan Barang
        <input
          name="pickupAt"
          type="datetime-local"
          required
          value={pickupAt}
          onChange={(e) => setPickupAt(e.target.value)}
        />
      </label>

      <label>
        Titik Temu / Selasar Pengambilan
        <input
          name="pickupPoint"
          required
          minLength={2}
          maxLength={160}
          placeholder="Contoh: Gazebo Utama FMIPA / Selasar Gedung Perkuliahan Bersama"
          value={pickupPoint}
          onChange={(e) => setPickupPoint(e.target.value)}
        />
      </label>

      <label>
        Catatan & Patokan Serah Terima
        <textarea
          name="pickupNote"
          rows={2}
          maxLength={300}
          placeholder="Contoh: Cari booth dengan payung hijau / chat WA saat tiba di lobi"
          value={pickupNote}
          onChange={(e) => setPickupNote(e.target.value)}
        />
      </label>

      <div className="seller-form-footer">
        <p className="form-hint">
          💡 <strong>Tips:</strong> Kuota akan berkurang otomatis setiap ada pesanan masuk. Saat kuota penuh, halaman PO otomatis terkunci sehingga kamu tidak akan kelebihan pesanan.
        </p>

        <button className="button button-primary button-large" disabled={busy}>
          {busy ? "Menerbitkan Batch PO…" : "🚀 Terbitkan Batch PO ke Etalase"}
        </button>

        {message && (
          <p role="alert" className="form-message">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
