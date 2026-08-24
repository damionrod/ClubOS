-- ClubOS Compact v18 upgrade
-- Run this ONCE on an existing ClubOS database after deploying Compact v18.

BEGIN;

-- Sports are intentionally simple: name is mandatory; season is optional.
ALTER TABLE public.sports
  ADD COLUMN IF NOT EXISTS season text;

-- Allow the same sport to be recorded for different seasons.
ALTER TABLE public.sports
  DROP CONSTRAINT IF EXISTS sports_organisation_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS sports_org_name_season_unique
  ON public.sports (organisation_id, lower(name), coalesce(lower(season), ''));

COMMIT;
