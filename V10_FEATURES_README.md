# ClubOS v10 — Organisation Currency

## Added
- Currency is selected when Platform Admin creates an organisation.
- Active currencies include NZD, AUD, USD, SGD, GBP, EUR, CAD, LKR, INR, MYR, AED, JPY, CHF and ZAR.
- The selected ISO currency is stored in `organisation_settings.currency`.
- Organisation Admin can review/change currency under **Settings → Organisation Settings**.
- If financial transactions already exist, changing currency shows a warning and requires confirmation. Historical amounts are never automatically converted.
- Membership type fees, event ticket prices, member event prices, payment/fee calculations, member payment examples and Income by Category reporting now render using the active organisation currency.

## Existing database
Run:
`supabase/migrations/20260824170000_016_organisation_currency.sql`

This migration does not convert any historical financial values. Existing organisations without settings default to NZD and can then be changed under Organisation Settings.
