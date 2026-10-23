import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Masuk" };
export default function SignInPage() { return <Suspense fallback={<main className="auth-page"><div className="auth-card">Memuat…</div></main>}><AuthForm mode="signin" /></Suspense>; }
