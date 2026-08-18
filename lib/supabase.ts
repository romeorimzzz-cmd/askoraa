import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://edbbfjyhbrrtpbjrwydd.supabase.co";

const supabasePublishableKey =
  "sb_publishable_jUOeW6ilu2vyVQYG8pc8Xw_6Q-ZwDkH";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);