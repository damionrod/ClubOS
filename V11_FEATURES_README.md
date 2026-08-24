# ClubOS v11 — Team Management & Team Subscriptions

## New functionality

### Team CRUD
Organisation admins can now:
- Create teams
- Edit teams
- Delete teams
- Set team name, sport, season, contact, description and status
- Assign a subscription/membership type to each team

### Default team subscription
The Teams page now includes an organisation-level **Default team subscription** setting.

When a new team is created:
1. The organisation's default subscription is automatically preselected.
2. The administrator can change it from the dropdown before saving.
3. Existing teams can be edited at any time to select another subscription.

The dropdown uses active entries from **Membership Types**, so the organisation controls the available subscription classes and fees from the existing Membership Types module.

## Existing Supabase project
Run only:

`supabase/migrations/20260824174500_017_team_management_and_default_subscription.sql`
