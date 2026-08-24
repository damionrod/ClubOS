# ClubOS v16 — Member Profile Route Repair

This release removes the duplicate legacy read-only MemberProfile export and explicitly routes `/member/profile` to the Supabase-backed editable member profile.

Member self-service includes:
- edit personal/contact/address details
- edit emergency contact
- edit permitted medical/accessibility details
- select/change team
- choose/upload/replace/remove member photo
- explicit Save Changes action

No new database migration is required beyond migrations already included through v15. If migration 018 has not previously been run, run it before testing member self-service.
