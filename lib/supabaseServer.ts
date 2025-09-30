// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // MVP (RLS abierto)
  if (!url || !key) throw new Error("Missing Supabase envs");
  return createClient(url, key, { auth: { persistSession: false } });
}
