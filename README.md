# ClubOS Compact v19

Compact browser-upload repository for ClubOS. This version keeps the project below GitHub's 100-file browser upload limit.

## v19 changes
- Separate **Subscription Types** from Membership Types.
- Teams now use Subscription Types and organisation default team subscription.
- Event banner upload storage/RLS repaired.
- Events remain editable and support multiple ticket types.
- Admin Event cards show purchased ticket/order details and export a ticket CSV report.
- Merchandise supports up to 2 product images stored in Supabase Storage.
- Members can browse both merchandise images before placing an order.

## Existing database upgrade
Run only:
`supabase/UPGRADE_COMPACT_V19.sql`

Do not run `COMPLETE_SETUP.sql` on an existing database.

## v20 – Save confirmations
ClubOS now includes a global notification/toast system. Core Admin, Member and Platform save/create/update/upload/delete workflows display a clear success confirmation after Supabase confirms the operation. Existing inline error handling remains in place for failed operations.

## Compact v22 changes

- Team records now contain team details only: name, sport, season, contact, status, description and optional logo.
- Subscriptions are assigned per player for a team/season (Full Time, Part Time, Casual or any organisation-defined type).
- Team roster management allows admins to search members, add/remove players and change each player's subscription.
- Per-player subscription charges appear as pending items in the Member Portal Payments page.
- Member Portal navigation now surfaces Shop, Donations, Payments, Events and Voting more clearly.
- Member donations are added to pending payments.
- `supabase/UPGRADE_COMPACT_V22.sql` is the only new SQL required for an existing database already upgraded through v21.
