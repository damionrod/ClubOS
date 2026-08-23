# ClubOS deployment notes

## GitHub / Netlify
- Source entry is `/index.html` -> `/src/main.tsx`.
- `dist/` is intentionally not committed.
- Netlify build command: `npm run build`.
- Netlify publish directory: `dist`.
- SPA redirects are supplied by both `netlify.toml` and `public/_redirects`.

## Supabase
Set these in Netlify Site configuration > Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not commit a real `.env` file. `.env.example` is included only as a template.

Apply the Supabase migrations in filename order. The new event module migration is:
`supabase/migrations/20260824090000_006_events_ticketing.sql`

It creates:
- events
- event_ticket_types
- event_orders
- event_tickets

It also inserts demo events, ticket types, orders and QR/check-in sample tickets for the existing Demo Sports Club.

## Event test data
Admin scanner route: `/admin/events/checkin`

Manual test codes:
- `CLUBOS-DEMO-VALID-001` — valid ticket; first verification marks it checked in.
- `CLUBOS-DEMO-USED-002` — already checked in; verifies duplicate-scan warning.
- `CLUBOS-DEMO-FAMILY-003` — another valid free-event ticket.

The member event page is `/member/events`. The existing demo owner account is linked to James Wilson, who has a sample Awards Night ticket.

## QR implementation note
The member ticket page renders QR images from api.qrserver.com using only the random ticket token (no member personal information is sent in the QR payload). Admin scanning uses the browser camera with BarcodeDetector where supported and always includes manual-code fallback. For a production launch, replacing the external QR renderer with a bundled QR library is recommended so QR generation has no third-party runtime dependency.
