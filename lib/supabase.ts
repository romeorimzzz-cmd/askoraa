import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "ASKORAA: NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "ASKORAA: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "askoraa-auth",
    },
  }
);