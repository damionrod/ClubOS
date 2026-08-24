# ClubOS Compact v17

Compact browser-uploadable repository (under 100 source files).

## v17 changes
- Full-access admins can edit and save member core details from the Member Detail screen.
- Each admin member update writes an `audit_logs` record with old/new values.
- Member Teams tab query repaired to avoid the blank-screen relationship error.
- Member Profile has a Home button.
- Events can be created and edited, including banner upload and multiple ticket types (Family, Single, Child, etc.).
- Published events have an external public URL at `/events/:slug` for ticket ordering.
- Event banner storage uses the `event-banners` Supabase bucket.
- QR check-in no longer relies on the browser-only BarcodeDetector API. It uses html5-qrcode, plus QR-image upload and manual-code fallbacks for mobile/older browsers.

## Existing Supabase database
Run once in Supabase SQL Editor:

`supabase/UPGRADE_COMPACT_V17.sql`

Do not run `COMPLETE_SETUP.sql` on an existing populated database.

## Fresh Supabase database
Run `supabase/COMPLETE_SETUP.sql` once.

## Netlify
Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in Netlify environment variables.

Paid external event orders remain `pending` until Stripe/POLi webhook integration is connected. Free tickets are issued immediately.
