# ClubOS v9 — Motions & Member Voting

## Added
- Real governance motions stored in Supabase.
- Voting audience: **All eligible members** or **Committee members only**.
- Named or secret ballot setting.
- Yes / No / Abstain voting.
- Opening and closing time, majority threshold, and quorum/participation threshold.
- Member Portal **Voting** page.
- Pending-vote badge in Member Portal navigation.
- One vote per signed-in user per motion.
- Supabase RLS / SECURITY DEFINER eligibility checks; UI hiding is not the only protection.
- Committee eligibility recognises active organisation owners and roles grouped as `Committee`, plus common committee role names.
- Demo member-wide motion and committee-only motion.

## Existing Supabase database
Run only:
`supabase/migrations/20260824161500_015_governance_member_voting.sql`

Then redeploy the v9 repository and sign out/sign back in.
