"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  className?: string;
  children?: React.ReactNode;
  iconOnly?: boolean;
};

export function LogoutButton({
  className = "button button-light button-small",
  children,
  iconOnly = false,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Gagal keluar akun via client:", err);
    } finally {
      // Pastikan redirect dan refresh state autentikasi bersih ke halaman utama
      window.location.href = "/";
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={className}
        title="Keluar dari akun"
        aria-label="Keluar dari akun"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {loading ? "..." : "Keluar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      title="Keluar dari akun OpenPO"
    >
      {loading ? (
        "Keluar..."
      ) : (
        children || (
          <>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </>
        )
      )}
    </button>
  );
}
