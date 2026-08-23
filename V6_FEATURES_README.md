# ClubOS v6 – Transaction Fees & Income Reporting

New functionality:

- Platform Admin → **Transaction Fees**
  - Enable/disable a ClubOS transaction fee.
  - Fixed dollar amount per transaction.
  - Percentage fee.
  - Optional minimum and maximum fee caps.
- Club Admin → Finance → **Payment & Fee Settings**
  - Member pays 100% of transaction fees.
  - Organisation absorbs 100%.
  - Split fees by a configurable member percentage.
  - Choose whether provider fees and ClubOS platform fees are included in the allocation.
  - Preview calculations using the built-in fee calculator.
- Club Admin → Reports & Analytics → **Income by Category**
  - Date filters.
  - Transaction counts.
  - Gross income.
  - Provider fees.
  - ClubOS fees.
  - Member-paid fees.
  - Organisation-absorbed fees.
  - Refunds.
  - Net income.
  - Percentage of total income.
  - CSV export.
- Configurable income categories stored per organisation.

## Existing Supabase project
Run only:

`supabase/migrations/20260824143000_012_transaction_fees_and_income_reporting.sql`

The migration seeds standard categories and representative demo income rows for Demo Sports Club.

Note: actual Stripe/POLi provider fees should be updated from provider settlement/webhook data when live payment integrations are enabled. The ClubOS platform fee calculation is implemented in the database and UI configuration, but provider credentials/webhooks are intentionally not included in source control.
