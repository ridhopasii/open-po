"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SellerAvatarUpload({ hasPhoto }: { hasPhoto: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Pilih foto JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Ukuran foto maksimal 2 MB.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sesi masukmu berakhir. Masuk kembali lalu coba lagi.");

      const path = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("po-seller-avatars")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw new Error("Foto belum berhasil diunggah. Coba lagi sebentar.");

      const { data, error: profileError } = await supabase
        .from("po_sellers")
        .update({ avatar_path: path })
        .eq("user_id", user.id)
        .select("user_id")
        .maybeSingle();
      if (profileError || !data) throw new Error("Foto terunggah, tetapi profil belum berhasil diperbarui. Muat ulang lalu coba lagi.");

      setMessage("Foto profil diperbarui.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Foto belum berhasil diunggah. Coba lagi sebentar.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="avatar-upload-wrap">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Pilih foto profil"
        disabled={busy}
        onChange={(event) => void upload(event.currentTarget.files?.[0])}
      />
      <button className="avatar-upload-button" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Mengunggah foto…" : hasPhoto ? "Ganti foto profil" : "Tambah foto profil"}
      </button>
      <span className="avatar-upload-help">JPG, PNG, atau WebP · maks. 2 MB</span>
      {message && <span className="avatar-upload-message" role="status">{message}</span>}
    </div>
  );
}
