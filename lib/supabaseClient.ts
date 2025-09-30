import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  throw new Error("Missing Supabase envs. Check .env.local and restart dev server.");
}
if (!key.startsWith("eyJ")) {
  console.warn("Anon key does not look like a JWT. Did you paste the right key?");
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });
