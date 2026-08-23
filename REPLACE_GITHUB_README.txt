CLUBOS - IMPORTANT GITHUB REPLACEMENT INSTRUCTIONS

The folder structure in this package MUST be preserved.

Correct examples:
  /index.html
  /package.json
  /netlify.toml
  /src/main.tsx
  /src/App.tsx
  /src/pages/admin/EventsPage.tsx
  /src/pages/admin/EventCheckin.tsx
  /src/pages/member/MemberEvents.tsx
  /supabase/migrations/20260824090000_006_events_ticketing.sql
  /public/_redirects

DO NOT upload all nested files individually into the repository root.
For example, main.tsx must NOT become /main.tsx. It must remain /src/main.tsx.

Recommended replacement method:
1. Clone the existing GitHub repository using GitHub Desktop.
2. Delete the existing repository files locally (leave the hidden .git folder intact).
3. Extract this ZIP.
4. Copy ALL contents from the extracted ClubOS package into the cloned repository folder.
5. In GitHub Desktop, review the changes, commit them, then Push origin.
6. In GitHub, confirm that you can browse to src/main.tsx.
7. Netlify should then deploy automatically.

Netlify build settings:
  Build command: npm run build
  Publish directory: dist

Required Netlify environment variables:
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY

Do not commit your real .env file.
