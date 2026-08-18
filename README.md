# ASKORAA V1 — Final public beta pack

## What this pack fixes
- Public Home, Problems and Solved Archive — no login wall for reading.
- Login/session persistence using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Post Your Problem has no ASK/HELP toggle.
- Own posts never show `I CAN HELP`.
- I CAN HELP uses `post_applications` and a database notification trigger.
- Accept & Solve uses the `accept_help_request` RPC to create one private two-person room atomically.
- Realtime room chat with persisted PostgreSQL history.
- Solver final solution + owner YES/NO.
- NO creates an unresolved archive record and can be reopened by the owner.
- YES closes the room and sends the owner to rating.
- Public date-grouped archive with search/category filters.
- Public safety, terms, support and report pages.
- Basic authenticated online counter.
- Responsive redesigned UI.

## Deploy
1. Replace the project source with this folder. Keep your `.git` folder and `.env.local` if you have them.
2. In Netlify environment variables set exactly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. In Supabase SQL Editor run the original `supabase/schema.sql` if this is a fresh project, otherwise run `supabase/migrations/20260818_askoraa_final_v1.sql`.
4. Push to GitHub. Netlify runs `npm run build`.

## Important
Do not put a Supabase service-role/secret key in the browser. The publishable key is the frontend key.
