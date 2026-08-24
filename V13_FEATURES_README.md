# ClubOS v13 — Member team selection

## Added
- Public member signup now asks for Organisation and optional Team.
- Only active organisations and active teams are shown.
- New signup accounts are linked to a pending member record and their selected team.
- If the selected team has a configured team subscription, it is used as the initial membership subscription when appropriate.
- Admin Add Member includes Team selection.
- Member Portal → My Profile includes an editable My Team dropdown.
- Admin → Member Register → Member → Teams now allows full-access users to add/remove team assignments.
- RLS restricts member self-service so a member can alter only their own normal `player` team assignment; team managers/full-access admins retain management access.

## Existing database
Run only:
`supabase/migrations/20260824193000_019_member_team_signup_and_edit.sql`
