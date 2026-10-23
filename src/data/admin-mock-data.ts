export type AdminSeller = {
  id: string;
  name: string;
  faculty: string;
  whatsapp: string;
  avatar_path?: string | null;
  total_batches: number;
  total_revenue: number;
  verified: boolean;
  joined_at: string;
};

export type AdminBatch = {
  id: string;
  title: string;
  product_name: string;
  category: string;
  seller_name: string;
  seller_faculty: string;
  seller_whatsapp: string;
  price_idr: number;
  quota: number;
  reserved_quantity: number;
  closes_at: string;
  pickup_at: string;
  pickup_point: string;
  status: "open" | "ready" | "closed" | "cancelled";
  is_featured?: boolean;
};

export type AdminOrder = {
  id: string;
  order_code: string;
  batch_id: string;
  product_name: string;
  buyer_name: string;
  buyer_faculty: string;
  buyer_whatsapp: string;
  seller_name: string;
  quantity: number;
  total_price_idr: number;
  status: "pending" | "confirmed" | "ready" | "picked_up" | "cancelled";
  created_at: string;
};

export const sampleAdminSellers: AdminSeller[] = [
  {
    id: "seller-1",
    name: "Nadia Putri",
    faculty: "Fakultas Pertanian",
    whatsapp: "081234567801",
    total_batches: 5,
    total_revenue: 1440000,
    verified: true,
    joined_at: "2026-09-15T08:00:00Z",
  },
  {
    id: "seller-2",
    name: "Rafi Maulana",
    faculty: "Fakultas Teknik",
    whatsapp: "081234567802",
    total_batches: 8,
    total_revenue: 2600000,
    verified: true,
    joined_at: "2026-09-10T10:30:00Z",
  },
  {
    id: "seller-3",
    name: "Salsabila N.",
    faculty: "Fakultas Kesehatan Masyarakat",
    whatsapp: "081234567803",
    total_batches: 4,
    total_revenue: 1260000,
    verified: true,
    joined_at: "2026-09-22T14:15:00Z",
  },
  {
    id: "seller-4",
    name: "Fajar Ramadhan",
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik",
    whatsapp: "081234567804",
    total_batches: 3,
    total_revenue: 900000,
    verified: false,
    joined_at: "2026-10-01T09:00:00Z",
  },
  {
    id: "seller-5",
    name: "Alya Syafira",
    faculty: "Fakultas Ekonomi dan Bisnis",
    whatsapp: "081234567805",
    total_batches: 2,
    total_revenue: 3400000,
    verified: true,
    joined_at: "2026-09-18T11:20:00Z",
  },
  {
    id: "seller-6",
    name: "Rizky Pratama",
    faculty: "Fakultas Ilmu Komputer dan TI",
    whatsapp: "081234567806",
    total_batches: 3,
    total_revenue: 1050000,
    verified: false,
    joined_at: "2026-10-05T13:40:00Z",
  },
];

export const sampleAdminBatches: AdminBatch[] = [
  {
    id: "sample-1",
    title: "Batch PO Risol mayo",
    product_name: "Risol mayo",
    category: "Makanan",
    seller_name: "Nadia Putri",
    seller_faculty: "Fakultas Pertanian",
    seller_whatsapp: "081234567801",
    price_idr: 12000,
    quota: 25,
    reserved_quantity: 18,
    closes_at: "2026-10-25T17:00:00Z",
    pickup_at: "2026-10-26T12:00:00Z",
    pickup_point: "Kantin Gedung Bersama / Gazebo Utama Kampus",
    status: "open",
    is_featured: true,
  },
  {
    id: "sample-2",
    title: "Batch PO Kopi susu gula aren",
    product_name: "Kopi susu gula aren",
    category: "Minuman",
    seller_name: "Rafi Maulana",
    seller_faculty: "Fakultas Teknik",
    seller_whatsapp: "081234567802",
    price_idr: 10000,
    quota: 40,
    reserved_quantity: 35,
    closes_at: "2026-10-25T15:00:00Z",
    pickup_at: "2026-10-26T11:00:00Z",
    pickup_point: "Lobi Gedung Kuliah Bersama Fakultas Teknik",
    status: "open",
    is_featured: true,
  },
  {
    id: "sample-3",
    title: "Batch PO Brownies sekat",
    product_name: "Brownies sekat",
    category: "Makanan",
    seller_name: "Salsabila N.",
    seller_faculty: "Fakultas Kesehatan Masyarakat",
    seller_whatsapp: "081234567803",
    price_idr: 18000,
    quota: 20,
    reserved_quantity: 20,
    closes_at: "2026-10-24T18:00:00Z",
    pickup_at: "2026-10-25T13:00:00Z",
    pickup_point: "Depan Perpustakaan Pusat",
    status: "ready",
    is_featured: false,
  },
  {
    id: "sample-4",
    title: "Batch PO Dimsum ayam",
    product_name: "Dimsum ayam",
    category: "Makanan",
    seller_name: "Fajar Ramadhan",
    seller_faculty: "Fakultas Ilmu Sosial dan Ilmu Politik",
    seller_whatsapp: "081234567804",
    price_idr: 15000,
    quota: 30,
    reserved_quantity: 14,
    closes_at: "2026-10-26T16:00:00Z",
    pickup_at: "2026-10-27T12:30:00Z",
    pickup_point: "Gazebo FISIP dekat kantin",
    status: "open",
    is_featured: false,
  },
  {
    id: "sample-5",
    title: "Batch PO Kaos acara angkatan",
    product_name: "Kaos acara angkatan",
    category: "Fashion",
    seller_name: "Alya Syafira",
    seller_faculty: "Fakultas Ekonomi dan Bisnis",
    seller_whatsapp: "081234567805",
    price_idr: 85000,
    quota: 50,
    reserved_quantity: 42,
    closes_at: "2026-10-28T20:00:00Z",
    pickup_at: "2026-10-30T14:00:00Z",
    pickup_point: "Hall Gedung C Fakultas Ekonomi dan Bisnis",
    status: "open",
    is_featured: true,
  },
  {
    id: "sample-8",
    title: "Batch PO Tote bag kanvas",
    product_name: "Tote bag kanvas",
    category: "Fashion",
    seller_name: "Rizky Pratama",
    seller_faculty: "Fakultas Ilmu Komputer dan TI",
    seller_whatsapp: "081234567806",
    price_idr: 35000,
    quota: 25,
    reserved_quantity: 25,
    closes_at: "2026-10-22T18:00:00Z",
    pickup_at: "2026-10-23T10:00:00Z",
    pickup_point: "Lab Komputer Lt. 2 Fasilkom-TI",
    status: "closed",
    is_featured: false,
  },
];

export const sampleAdminOrders: AdminOrder[] = [
  {
    id: "ord-101",
    order_code: "PO-7291A",
    batch_id: "sample-1",
    product_name: "Risol mayo",
    buyer_name: "Bima Arya",
    buyer_faculty: "Fakultas Teknik",
    buyer_whatsapp: "081399887711",
    seller_name: "Nadia Putri",
    quantity: 2,
    total_price_idr: 24000,
    status: "confirmed",
    created_at: "2026-10-22T14:20:00Z",
  },
  {
    id: "ord-102",
    order_code: "PO-8412B",
    batch_id: "sample-1",
    product_name: "Risol mayo",
    buyer_name: "Tiara Andini",
    buyer_faculty: "Fakultas Kedokteran",
    buyer_whatsapp: "081277665544",
    seller_name: "Nadia Putri",
    quantity: 3,
    total_price_idr: 36000,
    status: "ready",
    created_at: "2026-10-22T15:10:00Z",
  },
  {
    id: "ord-103",
    order_code: "PO-9104C",
    batch_id: "sample-2",
    product_name: "Kopi susu gula aren",
    buyer_name: "Dimas Anggara",
    buyer_faculty: "Fakultas Hukum",
    buyer_whatsapp: "082144332211",
    seller_name: "Rafi Maulana",
    quantity: 2,
    total_price_idr: 20000,
    status: "pending",
    created_at: "2026-10-22T16:05:00Z",
  },
  {
    id: "ord-104",
    order_code: "PO-3329D",
    batch_id: "sample-3",
    product_name: "Brownies sekat",
    buyer_name: "Clara Shinta",
    buyer_faculty: "Fakultas Psikologi",
    buyer_whatsapp: "085299881122",
    seller_name: "Salsabila N.",
    quantity: 1,
    total_price_idr: 18000,
    status: "picked_up",
    created_at: "2026-10-21T11:40:00Z",
  },
  {
    id: "ord-105",
    order_code: "PO-5512E",
    batch_id: "sample-5",
    product_name: "Kaos acara angkatan",
    buyer_name: "Hendra Wijaya",
    buyer_faculty: "Fakultas Ekonomi dan Bisnis",
    buyer_whatsapp: "081288776633",
    seller_name: "Alya Syafira",
    quantity: 1,
    total_price_idr: 85000,
    status: "confirmed",
    created_at: "2026-10-22T09:15:00Z",
  },
  {
    id: "ord-106",
    order_code: "PO-6621F",
    batch_id: "sample-4",
    product_name: "Dimsum ayam",
    buyer_name: "Rina Marlina",
    buyer_faculty: "Fakultas Ilmu Budaya",
    buyer_whatsapp: "087766554433",
    seller_name: "Fajar Ramadhan",
    quantity: 2,
    total_price_idr: 30000,
    status: "pending",
    created_at: "2026-10-22T17:30:00Z",
  },
];

export const sampleSellerDemoBatches = [
  {
    id: "batch-demo-1",
    title: "PO Risol Mayo Spesial",
    quota: 30,
    reserved_quantity: 22,
    closes_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    pickup_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    pickup_point: "Kantin Gedung Bersama Kampus",
    status: "open",
    product: { name: "Risol Mayo Spesial", price_idr: 12000 },
    orders: [
      {
        id: "demo-ord-1",
        order_code: "PO-8291",
        buyer_name: "Bima Arya",
        buyer_faculty: "Fakultas Teknik",
        buyer_whatsapp: "081399887711",
        quantity: 2,
        total_price_idr: 24000,
        status: "confirmed",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: "demo-ord-2",
        order_code: "PO-9102",
        buyer_name: "Tiara Andini",
        buyer_faculty: "Fakultas Kedokteran",
        buyer_whatsapp: "081277665544",
        quantity: 3,
        total_price_idr: 36000,
        status: "ready",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "demo-ord-3",
        order_code: "PO-4418",
        buyer_name: "Farhan Zaki",
        buyer_faculty: "Fakultas Hukum",
        buyer_whatsapp: "082155443322",
        quantity: 1,
        total_price_idr: 12000,
        status: "pending",
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
  {
    id: "batch-demo-2",
    title: "PO Kopi Susu Aren Literan",
    quota: 20,
    reserved_quantity: 20,
    closes_at: new Date(Date.now() - 86400000).toISOString(),
    pickup_at: new Date(Date.now() + 86400000).toISOString(),
    pickup_point: "Depan Perpustakaan Pusat",
    status: "ready",
    product: { name: "Kopi Susu Aren 1 Liter", price_idr: 45000 },
    orders: [
      {
        id: "demo-ord-4",
        order_code: "PO-1092",
        buyer_name: "Siti Rahma",
        buyer_faculty: "Fakultas Ekonomi dan Bisnis",
        buyer_whatsapp: "085211223344",
        quantity: 1,
        total_price_idr: 45000,
        status: "ready",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "demo-ord-5",
        order_code: "PO-3301",
        buyer_name: "Agus Pratama",
        buyer_faculty: "Fakultas Pertanian",
        buyer_whatsapp: "081299001122",
        quantity: 2,
        total_price_idr: 90000,
        status: "picked_up",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  },
];
