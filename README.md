# ASKORAA V1

ASKORAA V1 is intentionally small.

## V1 scope

Profile + Login
ASK / HELP
I CAN HELP
One problem owner + one solver
Private realtime text Solve Room
YES / NO
Simple field-wise 1–5 rating

V2 features such as badges, MCoin, streaks, archive, AI similarity, reviewers, visitor count and advanced admin are NOT included.

---

## 1. What you need

Create accounts at:

- Supabase: https://supabase.com
- Vercel: https://vercel.com
- GitHub: https://github.com

A GitHub account is recommended for deployment.

---

## 2. Create the Supabase database

1. Open Supabase.
2. Create a new project.
3. Open **SQL Editor**.
4. Open `supabase/schema.sql` from this ZIP.
5. Copy the entire file.
6. Paste it into SQL Editor.
7. Run it.
8. Wait for success.

This creates the V1 database, RLS policies, profile trigger and chat realtime publication.

IMPORTANT:
Do not skip the SQL file.

---

## 3. Get Supabase keys

In Supabase open the project settings/API area.

Copy:

- Project URL
- Publishable/anon client key

Create a local `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_CLIENT_KEY
```

Do NOT put a Supabase secret/service-role key in the browser.

---

## 4. Run locally

Install Node.js LTS.

Then open the project folder in terminal:

```bash
npm install
npm run dev
```

Open:

http://localhost:3000

Test:

1. Register two accounts.
2. Login as user A.
3. Create an ASK.
4. Login as user B in another browser/incognito window.
5. Open Home.
6. Press I CAN HELP.
7. Return to user A.
8. Open the post.
9. Select user B.
10. Start/enter the Solve Room.
11. Send messages from both browsers.
12. Confirm messages appear without refresh.
13. Press YES as the owner.
14. Submit rating.
15. Confirm rating appears in the database.

---

## 5. Deploy to Vercel

Recommended method:

1. Create a GitHub repository named `askoraa-v1`.
2. Upload/push this project to GitHub.
3. Open Vercel.
4. Add New Project.
5. Import the GitHub repository.
6. Framework should be detected as Next.js.
7. Add environment variables:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_ANON_KEY`

8. Deploy.

Vercel will build the Next.js application.

---

## 6. Very important: Supabase Auth email confirmation

If Supabase email confirmation is enabled, registration may ask the user to verify their email before a session is created.

For a small private beta you can configure the Auth settings according to your testing needs.

Before public launch, use proper email verification and production authentication settings.

---

## 7. V1 limitations by design

This build intentionally does NOT contain:

- Badges
- MCoin
- Streaks
- Milestones
- Full reputation engine
- Knowledge archive
- AI similarity
- Vector search
- Reviewer system
- Friend-based reviewer picker
- Public visitor count
- Advanced presence
- Paid Solver
- Paid plans
- Voice/video
- Anonymous mode
- AI solver
- Full analytics dashboard

These belong to V2/future.

---

## 8. Before giving it to real users

Run this checklist:

- [ ] Registration
- [ ] Login
- [ ] Profile
- [ ] ASK
- [ ] HELP
- [ ] I CAN HELP
- [ ] Solver selection
- [ ] Two-person room
- [ ] Realtime chat
- [ ] Refresh chat history
- [ ] Reconnect after network interruption
- [ ] YES
- [ ] NO
- [ ] Rating
- [ ] Unauthorized room access blocked
- [ ] Third person blocked
- [ ] RLS tested
- [ ] Mobile layout tested

Then test with 50–100 real users.

---

## 9. Product decision

Do not rush into V2.

The main experiment is:

ASK → HELP → SOLVE → YES/NO → RATING → RETURN

If users genuinely return because this is useful, then start V2.

---

## 10. Architecture rule

The V1 code is modular so V2 can be added later.

Do not rewrite the entire project just to add:

- badges
- MCoin
- reviewers
- archive
- AI similarity

Add each as a separate module/service when the product is validated.

---

## 11. Important production note

This is a V1 MVP source package designed for Supabase + Vercel. It is not a claim that any hosting provider's free plan is unlimited, nor is it a legal/security certification.

Before public launch, perform a proper security review, privacy/terms setup, abuse controls and production testing.
