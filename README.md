# Open PO

Marketplace pre-order untuk mahasiswa. Penjual membuat batch dengan kuota, batas pesan, jadwal dan titik pengambilan. Pembeli memesan lewat akun; kuota dikunci dalam transaksi database.

## Menjalankan lokal

1. Salin `.env.example` ke `.env.local` dan isi URL serta kunci publik Supabase StudentPlace.
2. Jalankan `npm install` lalu `npm run dev`.
3. Buka `http://localhost:3000`.

## Menyiapkan Supabase StudentPlace

1. Buka [SQL Editor StudentPlace](https://supabase.com/dashboard/project/autgrnrqeqdpqwkbolyh/sql/new).
2. Jalankan seluruh isi `supabase/migrations/202610220001_open_po_marketplace.sql`. Migrasi hanya membuat objek baru berawalan `po_`.
3. Di **Authentication → URL Configuration**, tambahkan redirect URL `https://open-po.vercel.app/auth/callback` serta `http://localhost:3000/auth/callback`. Karena StudentPlace memakai proyek Supabase yang sama, biarkan **Site URL** yang sudah ada agar alur autentikasi StudentPlace tidak berubah.
4. Pastikan variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pada proyek Vercel `open-po` tetap menunjuk ke StudentPlace.

## Alur yang tersedia

- Etalase PO aktif, filter kategori dan pencarian.
- Daftar/masuk dengan Supabase Auth.
- Detail batch dan pemesanan yang mengunci kuota secara atomik.
- Riwayat pesanan dan pembatalan pesanan tertunda.
- Tombol logout / keluar dari akun pembeli dan penjual.
- Dashboard penjual untuk membuat PO dan memperbarui status pesanan.
- RLS dan RPC dengan validasi kepemilikan serta perubahan status yang dibatasi.

Pembayaran masih disepakati langsung antara pembeli dan penjual. Platform belum memungut atau memproses pembayaran.

## Build

`npm run build` menjalankan build produksi Next.js melalui Webpack. Build lokal sudah berhasil.
