-- ORMEN Atelier: "Müşterinin salonu" (Showroom package, job 15). A photo
-- session now says what it is for: the customer's sofa (job 5) or their
-- room (job 15). A room photo is never kept for the shop: the keep flag
-- cannot be set on such a session.
-- Only adds. Undo: supabase/geri-al/20261127000300_salon.sql

alter table public.photo_sessions add column if not exists purpose text not null default 'koltuk' check (purpose in ('koltuk', 'salon'));
alter table public.photo_sessions add constraint photo_sessions_salon_not_kept check (purpose <> 'salon' or not keep);
