-- K-23 (PO decision, R0.2-0): Free holds 1 active Slot (final). Pro stays 3 (K-03).
-- Every other limit is unchanged and still 'proposed'. Rows are re-stamped as the CONFIG_VERSION 2 snapshot of
-- src/lib/entitlements/config.ts; the PGlite migration test checks exact parity.
update public.plan_features
set "limit" = 1, status = 'final', note = 'K-23'
where plan = 'free' and feature = 'activeSlots';

update public.plan_features set config_version = 2;
