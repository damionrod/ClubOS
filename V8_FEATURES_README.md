# ClubOS v8 — Member Self-Service Profile

New in v8:

- Member Portal > My Profile now loads the signed-in member's real Supabase record.
- Members can edit their own personal/contact/address details.
- Members can upload, replace and remove their own profile photo.
- Members can add/update their emergency contact.
- Members can add/update medical, allergy, medication, injury, dietary and accessibility information.
- Profile updates are written to member_activity for audit history.
- Membership-controlled fields such as member number, membership type, status, paid-until and voting eligibility remain admin-controlled.

For an existing v7 database, run only:

`supabase/migrations/20260824154500_014_member_self_service_profile.sql`
