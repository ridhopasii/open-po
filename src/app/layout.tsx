import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenPO — PO mahasiswa USU & POLMED",
    template: "%s · OpenPO",
  },
  description:
    "Cari barang pre-order dari mahasiswa dan ambil sesuai jadwal di kampus.",
  applicationName: "OpenPO by kampusfess.id",
  metadataBase: new URL("https://open-po.vercel.app"),
  openGraph: {
    title: "OpenPO — PO mahasiswa USU & POLMED",
    description:
      "Cari barang pre-order dari mahasiswa dan ambil sesuai jadwal di kampus.",
    siteName: "OpenPO by kampusfess.id",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenPO — marketplace pre-order kampus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenPO — PO mahasiswa USU & POLMED",
    description:
      "Cari barang pre-order dari mahasiswa dan ambil sesuai jadwal di kampus.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
