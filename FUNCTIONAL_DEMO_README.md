# ClubOS Functional Demo Update

For an existing Supabase project that already has migrations 001–008, run:

`supabase/migrations/20260824120000_009_functional_module_records.sql`

Then redeploy the repository on Netlify and sign out/sign back in.

## Functional in this demo
- Add new members with membership type, emergency contact, guardian and medical/allergy information.
- Existing member register/detail, applications, membership types, custom fields and teams remain Supabase-backed.
- Create events with date/time, venue, capacity, status and first ticket type.
- Delete events and use QR check-in.
- Admin modules now support persistent Supabase Add/Edit/Delete/Search/CSV Export for finance, transactions, communications, governance, committee, motions, documents, merchandise, donations, contacts, contracts, tasks, privacy, compliance, reports, club settings, branding, users, roles, modules and sports.
- Platform Admin modules now support persistent Add/Edit/Delete/Search/CSV Export.
- Each module automatically seeds its included sample records into Supabase the first time it is opened after migration 009.

## External services
Stripe, POLi and real outbound email cannot execute live transactions until provider credentials/webhooks are configured. Their records and administration workflows can be tested in the demo, but live payment/email transport requires those external accounts.
