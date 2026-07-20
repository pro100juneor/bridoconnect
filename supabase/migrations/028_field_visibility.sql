-- 028_field_visibility.sql
-- Lets a recipient decide which sections of their own public page (/u/:slug) are
-- shown to visitors, plus a read-only verification badge.
--
-- field_visibility is a section -> bool map. A MISSING key means "visible"
-- (default-on), so an empty '{}' shows everything. Known keys mirror the public
-- page sections: 'bio', 'photos', 'wall', 'wishlist', 'location'.
--
-- verification_status is set by the verification flow / an admin, never by the
-- user themselves — the UI only displays it. No passport / bank columns here
-- (that stays a separate, deferred task).

alter table public.profiles
  add column if not exists field_visibility jsonb not null default '{}';

alter table public.profiles
  add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified'));
