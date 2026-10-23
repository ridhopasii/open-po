const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateUser(email, password, metadata = {}) {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`User ${email} already exists:`, existing.id);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to create ${email}: ${error.message}`);
  }
  console.log(`Created user ${email}:`, data.user.id);
  return data.user;
}

async function seed() {
  console.log("=== SEEDING REAL OPENPO DATA ===");

  // 1. Create Users
  const userNadia = await getOrCreateUser("seller.nadia@openpo.id", "Kampus2026!", {
    name: "Nadia Putri",
    faculty: "Fakultas Pertanian",
  });

  const userRafi = await getOrCreateUser("seller.rafi@openpo.id", "Kampus2026!", {
    name: "Rafi Maulana",
    faculty: "Fakultas Teknik",
  });

  const userSalsa = await getOrCreateUser("seller.salsa@openpo.id", "Kampus2026!", {
    name: "Salsabila N.",
    faculty: "Fakultas Kesehatan Masyarakat",
  });

  const userAlya = await getOrCreateUser("seller.alya@openpo.id", "Kampus2026!", {
    name: "Alya Syafira",
    faculty: "Fakultas Ekonomi dan Bisnis",
  });

  const userBuyer = await getOrCreateUser("buyer.bima@openpo.id", "Kampus2026!", {
    name: "Bima Arya",
    faculty: "Fakultas Teknik",
  });

  await getOrCreateUser("admin@openpo.id", "AdminOpenPO2026!", {
    name: "Superadmin Kampus",
    role: "admin",
  });

  // 2. Insert Sellers into po_sellers
  const sellersData = [
    {
      user_id: userNadia.id,
      display_name: "Nadia Putri",
      faculty: "Fakultas Pertanian",
      whatsapp: "081234567801",
    },
    {
      user_id: userRafi.id,
      display_name: "Rafi Maulana",
      faculty: "Fakultas Teknik",
      whatsapp: "081234567802",
    },
    {
      user_id: userSalsa.id,
      display_name: "Salsabila N.",
      faculty: "Fakultas Kesehatan Masyarakat",
      whatsapp: "081234567803",
    },
    {
      user_id: userAlya.id,
      display_name: "Alya Syafira",
      faculty: "Fakultas Ekonomi dan Bisnis",
      whatsapp: "081234567805",
    },
  ];

  for (const s of sellersData) {
    const { error } = await supabase.from("po_sellers").upsert(s, { onConflict: "user_id" });
    if (error) console.error("Error upserting seller:", s.display_name, error.message);
    else console.log("Seller saved:", s.display_name);
  }

  // 3. Clear existing batches & products if re-seeding to keep clean
  await supabase.from("po_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("po_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("po_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Insert Products
  const products = [
    {
      seller_id: userNadia.id,
      name: "Risol Mayo Spesial",
      category: "Makanan",
      description: "Isi 3 pcs dengan isian smoked beef gurih, telur rebus iris, keju lumer, dan saus mayo creamy buatan sendiri. Digoreng hangat menjelang waktu pickup.",
      price_idr: 12000,
      active: true,
    },
    {
      seller_id: userRafi.id,
      name: "Kopi Susu Gula Aren",
      category: "Minuman",
      description: "Botol 250 ml racikan espresso arabika & robusta khas Mandheling dipadu susu segar creamy dan gula aren asli. Pas banget buat teman belajar.",
      price_idr: 10000,
      active: true,
    },
    {
      seller_id: userSalsa.id,
      name: "Fudgy Brownies Sekat",
      category: "Makanan",
      description: "Box isi 4 potong brownies cokelat fudgy leleh dengan topping almond slice, choco chips, keju cheddar, dan lotus biscoff.",
      price_idr: 18000,
      active: true,
    },
    {
      seller_id: userAlya.id,
      name: "Kaos Acara Angkatan",
      category: "Fashion",
      description: "Cotton combed 24s adem dan tebal berkualitas premium. Sablon plastisol tahan cuci. Tersedia ukuran S, M, L, XL, XXL.",
      price_idr: 85000,
      active: true,
    },
  ];

  const { data: insertedProducts, error: prodErr } = await supabase
    .from("po_products")
    .insert(products)
    .select();

  if (prodErr) {
    console.error("Error inserting products:", prodErr);
    return;
  }
  console.log(`Inserted ${insertedProducts.length} products`);

  // 5. Insert Batches
  const now = Date.now();
  const day = 86400000;

  const batches = [
    {
      product_id: insertedProducts[0].id,
      title: "Batch PO Risol Mayo Hangat #1",
      quota: 30,
      reserved_quantity: 15,
      closes_at: new Date(now + 2 * day).toISOString(),
      pickup_at: new Date(now + 3 * day).toISOString(),
      pickup_point: "Kantin Gedung Bersama / Gazebo Utama",
      pickup_note: "Pengambilan langsung dengan menunjukkan nama pemesan / kode PO. Pembayaran COD atau QRIS di tempat.",
      status: "open",
    },
    {
      product_id: insertedProducts[1].id,
      title: "Batch PO Kopi Susu Segar Kampus #3",
      quota: 40,
      reserved_quantity: 28,
      closes_at: new Date(now + 1.5 * day).toISOString(),
      pickup_at: new Date(now + 2.5 * day).toISOString(),
      pickup_point: "Lobi Gedung Kuliah Bersama Fakultas Teknik",
      pickup_note: "Kopi diserahkan dalam kondisi dingin segar dari coolbox.",
      status: "open",
    },
    {
      product_id: insertedProducts[2].id,
      title: "Batch PO Brownies Sekat Manis #2",
      quota: 25,
      reserved_quantity: 19,
      closes_at: new Date(now + 3 * day).toISOString(),
      pickup_at: new Date(now + 4 * day).toISOString(),
      pickup_point: "Depan Perpustakaan Pusat Kampus",
      pickup_note: "Bisa chat WhatsApp dulu jika butuh penyesuaian jam ambil.",
      status: "open",
    },
    {
      product_id: insertedProducts[3].id,
      title: "Batch PO Kaos Angkatan Kloter 1",
      quota: 50,
      reserved_quantity: 36,
      closes_at: new Date(now + 4 * day).toISOString(),
      pickup_at: new Date(now + 6 * day).toISOString(),
      pickup_point: "Hall Gedung C Fakultas Ekonomi & Bisnis",
      pickup_note: "Harap konfirmasi ukuran kaos via WhatsApp ke penjual.",
      status: "open",
    },
  ];

  const { data: insertedBatches, error: batchErr } = await supabase
    .from("po_batches")
    .insert(batches)
    .select();

  if (batchErr) {
    console.error("Error inserting batches:", batchErr);
    return;
  }
  console.log(`Inserted ${insertedBatches.length} batches`);

  // 6. Insert Orders
  const orders = [
    {
      order_code: "PO-7821A",
      batch_id: insertedBatches[0].id,
      buyer_id: userBuyer.id,
      buyer_name: "Bima Arya",
      buyer_faculty: "Fakultas Teknik",
      buyer_whatsapp: "081399887711",
      quantity: 2,
      unit_price_idr: 12000,
      status: "confirmed",
    },
    {
      order_code: "PO-8942B",
      batch_id: insertedBatches[0].id,
      buyer_id: userBuyer.id,
      buyer_name: "Tiara Andini",
      buyer_faculty: "Fakultas Kedokteran",
      buyer_whatsapp: "081277665544",
      quantity: 3,
      unit_price_idr: 12000,
      status: "ready",
    },
    {
      order_code: "PO-9103C",
      batch_id: insertedBatches[1].id,
      buyer_id: userBuyer.id,
      buyer_name: "Dimas Anggara",
      buyer_faculty: "Fakultas Hukum",
      buyer_whatsapp: "082144332211",
      quantity: 2,
      unit_price_idr: 10000,
      status: "confirmed",
    },
    {
      order_code: "PO-3394D",
      batch_id: insertedBatches[2].id,
      buyer_id: userBuyer.id,
      buyer_name: "Clara Shinta",
      buyer_faculty: "Fakultas Psikologi",
      buyer_whatsapp: "085299881122",
      quantity: 1,
      unit_price_idr: 18000,
      status: "pending",
    },
    {
      order_code: "PO-5518E",
      batch_id: insertedBatches[3].id,
      buyer_id: userBuyer.id,
      buyer_name: "Hendra Wijaya",
      buyer_faculty: "Fakultas Ekonomi dan Bisnis",
      buyer_whatsapp: "081288776633",
      quantity: 1,
      unit_price_idr: 85000,
      status: "confirmed",
    },
  ];

  const { data: insertedOrders, error: orderErr } = await supabase
    .from("po_orders")
    .insert(orders)
    .select();

  if (orderErr) {
    console.error("Error inserting orders:", orderErr);
    return;
  }
  console.log(`Inserted ${insertedOrders.length} orders successfully!`);
  console.log("=== SEEDING COMPLETED ===");
}

seed().catch(console.error);
