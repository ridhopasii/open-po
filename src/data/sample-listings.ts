import type { OpenBatch } from "@/lib/marketplace-shared";

export type SampleListing = {
  id: string;
  category: string;
  name: string;
  note: string;
  description?: string;
  price: number;
  photo: string;
  seller: string;
  faculty: string;
};

export const sampleListings: SampleListing[] = [
  {
    id: "sample-1",
    category: "Makanan",
    name: "Risol mayo",
    note: "Isi 3 pcs",
    description: "Risol mayo hangat dengan isian smoked beef, telur rebus iris, keju lumer, dan saus mayones spesial gurih creamy. Digoreng saat jam ambil agar tetap renyah.",
    price: 12000,
    photo: "/images/risol-mayo.png",
    seller: "Nadia Putri",
    faculty: "Fakultas Pertanian",
  },
  {
    id: "sample-2",
    category: "Minuman",
    name: "Kopi susu gula aren",
    note: "Botol 250 ml",
    description: "Espresso robusta & arabika blend dipadu susu segar creamy dan gula aren organik asli. Dingin, segar, cocok buat nemenin nugas di kampus.",
    price: 10000,
    photo: "/images/kopi-susu.png",
    seller: "Rafi Maulana",
    faculty: "Fakultas Teknik",
  },
  {
    id: "sample-3",
    category: "Makanan",
    name: "Brownies sekat",
    note: "Box isi 4 potong",
    description: "Fudgy brownies dengan shiny crust premium. Dilengkapi aneka topping favorit: almond slice, choco chips, keju cheddar, dan biskuit lotus.",
    price: 18000,
    photo: "/images/brownies.png",
    seller: "Salsabila N.",
    faculty: "Fakultas Kesehatan Masyarakat",
  },
  {
    id: "sample-4",
    category: "Makanan",
    name: "Dimsum ayam",
    note: "Isi 4 pcs + saus cocol",
    description: "Dimsum ayam homemade full daging dengan kulit tipis lembut. Disajikan lengkap bersama chili oil dan saus asam manis pedas racikan sendiri.",
    price: 15000,
    photo: "/images/dimsum.png",
    seller: "Fajar Ramadhan",
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik",
  },
  {
    id: "sample-5",
    category: "Fashion",
    name: "Kaos acara angkatan",
    note: "PO ukuran S–XXL",
    description: "Bahan cotton combed 24s adem dan tebal nyaman. Sablon plastisol tahan cuci. Desain eksklusif angkatan, bisa pilih ukuran saat pesan.",
    price: 85000,
    photo: "/images/kaos-angkatan.png",
    seller: "Alya Syafira",
    faculty: "Fakultas Ekonomi dan Bisnis",
  },
  {
    id: "sample-6",
    category: "Kerajinan",
    name: "Buket mini",
    note: "Bunga pilihan & kartu ucapan",
    description: "Buket mini cantik dengan bunga artificial awet dan wrapping aesthetic ala Korea. Pas banget untuk hadiah wisuda, sempro, atau apresiasi teman.",
    price: 25000,
    photo: "/images/bouquet.png",
    seller: "Intan Permata",
    faculty: "Fakultas Ilmu Budaya",
  },
  {
    id: "sample-7",
    category: "Kerajinan",
    name: "Phone charm manik",
    note: "Bikin warna sendiri",
    description: "Gantungan hp manik-manik tali kuat anti putus dengan kombinasi manik pastel aesthetic. Bisa request inisial nama atau kombinasi warna favorit.",
    price: 15000,
    photo: "/images/phone-charm.png",
    seller: "Dinda Aulia",
    faculty: "Fakultas Farmasi",
  },
  {
    id: "sample-8",
    category: "Fashion",
    name: "Tote bag kanvas",
    note: "Bisa custom nama / sablon",
    description: "Tote bag kanvas tebal 12 oz dengan ritsleting dan saku kecil di dalam. Muat laptop 14 inch, buku catatan, dan botol minum.",
    price: 35000,
    photo: "/images/tote-bag.png",
    seller: "Rizky Pratama",
    faculty: "Fakultas Ilmu Komputer dan Teknologi Informasi",
  },
];

export function getSampleBatch(id: string): OpenBatch | null {
  const normalizedId = id.trim().toLowerCase();
  const num = parseInt(normalizedId.replace(/^(sample|demo)-/, ""), 10);
  const item = sampleListings.find(
    (s, idx) => s.id === normalizedId || (Number.isFinite(num) && idx + 1 === num),
  );

  if (!item) return null;

  const closesAt = "2026-10-26T17:00:00.000Z";
  const pickupAt = "2026-10-28T12:00:00.000Z";

  return {
    id: item.id,
    title: `Batch PO ${item.name}`,
    quota: 25,
    reserved_quantity: 8,
    closes_at: closesAt,
    pickup_at: pickupAt,
    pickup_point: "Kantin Gedung Bersama / Gazebo Utama Kampus",
    pickup_note: "Pengambilan langsung dengan menunjukkan nama/kode pesanan. Bisa bayar tunai / QRIS di tempat.",
    photo: item.photo,
    is_sample: true,
    product: {
      id: `prod-${item.id}`,
      name: item.name,
      description: item.description ?? item.note,
      category: item.category,
      price_idr: item.price,
      seller: {
        display_name: item.seller,
        faculty: item.faculty,
        avatar_path: null,
      },
    },
  };
}
