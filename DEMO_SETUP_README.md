# ClubOS Complete Demo Setup

This repository includes populated demo screens for Club Admin, Member and Platform Admin.

## Database order
Run migrations in Supabase SQL Editor in filename order:
1. 20260822054712_001_foundation_tables.sql
2. 20260822054745_002_foundation_policies.sql
3. 20260822054839_003_membership_tables.sql
4. 20260822055036_004_seed_platform_data.sql
5. 20260822055201_005_demo_auth_users_fixed.sql
6. 20260824090000_006_events_ticketing.sql
7. 20260824103000_007_complete_demo_data.sql

Migration 007 repairs the organisation links for demo users already present in Supabase and adds rich member test data plus data for finance, communications, governance, documents, merchandise, donations, contacts, contracts, tasks, privacy, compliance, support and platform usage.

## Demo accounts
Password for seeded demo users: `DemoClub2025!`

- owner@demosportsclub.example — Organisation Owner
- secretary@demosportsclub.example — Secretary
- treasurer@demosportsclub.example — Treasurer
- teammanager@demosportsclub.example — Team Manager
- readonly@demosportsclub.example — Read Only Administrator
- platform.admin@clubos.example — Platform Admin

The visible platform/admin demo pages are deliberately populated even if a specific extended module has not yet been wired to full CRUD. Use them to test navigation, layouts, search, exports and representative records.
