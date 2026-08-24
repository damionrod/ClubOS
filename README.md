# ClubOS Compact v27

This is the compact replacement repository.

## Existing Supabase database
Run only:
`supabase/UPGRADE_COMPACT_V27.sql`

## Fresh Supabase database
Run:
`supabase/COMPLETE_SETUP.sql`

Do not run `COMPLETE_SETUP.sql` on an existing populated database.

The application source is under `src/` and Netlify builds with `npm run build`.
