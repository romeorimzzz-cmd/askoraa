import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // The app will show a clear configuration message on pages that use Supabase.
  console.warn("ASKORAA: Supabase environment variables are missing.");
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder"
);
