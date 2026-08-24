# ClubOS Compact v18

Compact browser-uploadable ClubOS repository.

## v18 changes
- Sports administration simplified to Sport Name (required) + Season (optional).
- Sports are saved as organisation records and are the source of the Sport dropdown on Teams.
- Team season is inherited from the selected Sport record.
- Sports used by teams cannot be deleted until those teams are reassigned/deleted.
- Member profile photos now display on the Admin Member Register detail page.

## Existing Supabase database
Run only:
`supabase/UPGRADE_COMPACT_V18.sql`

Do not run `COMPLETE_SETUP.sql` on an existing populated database.
