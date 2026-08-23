# ClubOS v5 additions

Run `supabase/migrations/20260824133000_011_member_photos_and_role_structure.sql` on an existing database.

New functionality:
- Member photo upload (JPG/PNG/WebP, 5 MB) to Supabase Storage bucket `member-photos`.
- Bulk member import from CSV, XLSX or XLS with preview, validation, duplicate detection and membership assignment.
- Downloadable CSV import template.
- Organisation Structure & Roles page with role creation/editing, permission assignment, user-to-role assignment and deletion safeguards.

The Excel importer uses the `xlsx` npm package. Netlify will install it from package.json during the next deployment.
