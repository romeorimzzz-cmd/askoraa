import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!rawUrl) {
  throw new Error(
    "ASKORAA: NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}

if (!key) {
  throw new Error(
    "ASKORAA: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing."
  );
}

/*
  Supabase project URL must be:

  https://PROJECT.supabase.co

  Never:

  https://PROJECT.supabase.co/rest/v1

  Supabase JS automatically adds:
  /rest/v1
  /auth/v1
  /realtime/v1
*/

const supabaseUrl = rawUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/i, "");

export const supabase = createClient(
  supabaseUrl,
  key.trim(),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "askoraa-auth",
    },

    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);