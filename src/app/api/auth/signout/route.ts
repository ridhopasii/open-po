import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Signout API error:", error);
  }

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
