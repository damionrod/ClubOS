# ClubOS Compact Repository

This is the compact browser-upload version of ClubOS v16.

## GitHub upload
Upload the complete contents of this folder to the repository root. The package contains fewer than 100 files so GitHub's browser uploader can accept the full project in one upload. Preserve the folders (`src`, `public`, `supabase`).

## Supabase
- Existing ClubOS database already upgraded through migration 020: do **not** run `supabase/COMPLETE_SETUP.sql` again.
- Brand-new/empty Supabase project: run `supabase/COMPLETE_SETUP.sql` once in the Supabase SQL Editor.

## Netlify environment variables
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify.

## Important member profile route
`/member/profile` uses `src/pages/member/MemberProfile.tsx` (editable profile/photo page), not the old read-only demo component.
