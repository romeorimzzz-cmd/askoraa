import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "ASKORAA: NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}

if (!supabaseKey) {
  throw new Error(
    "ASKORAA: Supabase publishable/anon key is missing."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);