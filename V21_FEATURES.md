# Compact v21

- Adds a visible Admin > Membership > Subscriptions section.
- Subscription records can be scoped to the whole organisation, one sport, or one team.
- Subscriptions can be season-specific and have independent prices (e.g. Full Time, Part Time, Casual).
- Member signup asks for a team and then an eligible subscription for that team/season.
- Member Profile allows the member to change team/subscription for the selected season. Previous season records are preserved.
- Full-access admins can assign/change a member team and subscription from the Member Registry Teams tab.
- Existing team assignments are backfilled to their team default subscription where possible.

Existing Supabase projects: run `supabase/UPGRADE_COMPACT_V21.sql` once.
