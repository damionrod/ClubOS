# ClubOS v12

This update fixes member self-service and governance voting.

## Member profile
- Resolves the signed-in member from the Auth user directly.
- Repairs older unlinked member records by matching the authenticated email only when the member row is unclaimed.
- Members can edit their permitted profile fields.
- Members can choose, upload, replace and remove their profile photo.
- Photo upload has a dedicated Upload photo action and also syncs the portal avatar.

## Motions and voting
- Every motion now requires a Motion closing date & time.
- Closing date/time must be after voting opens.
- Admins can edit a motion, including the closing date/time.
- Expired motions are treated as closed for member/admin displays.
- Votes are submitted through a validated Supabase RPC.
- All-eligible-member and committee-only eligibility remains server enforced.
- Pending-vote badges count only open, unvoted, eligible motions that have not passed their closing time.

## Existing Supabase project
Run only:

`supabase/migrations/20260824183000_018_member_profile_and_voting_repair.sql`
