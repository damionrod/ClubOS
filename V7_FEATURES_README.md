# ClubOS v7 - Organisation Branding

## New feature
Admin > Settings > Branding now includes a real organisation logo workflow.

- Upload PNG, JPG/JPEG, WebP or SVG logos (max 5 MB)
- Preview before saving
- Replace an existing logo
- Remove the logo
- Logo is stored in the Supabase `organisation-branding` Storage bucket
- `organisation_branding.logo_url` stores the public logo URL
- Admin and Member portal headers automatically show the organisation logo
- Brand colour settings remain editable alongside the logo

## Existing Supabase database
Run only:

`supabase/migrations/20260824150000_013_organisation_branding_logo_storage.sql`

Then redeploy Netlify, sign out/in if needed, and go to Admin > Settings > Branding.
