-- MEMOIVE owner-only cloud storage. Run once in Supabase SQL Editor.
create table if not exists public.memoive_owner_state (
  id text primary key check (id = 'owner'),
  payload jsonb not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

alter table public.memoive_owner_state enable row level security;
revoke all on table public.memoive_owner_state from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memoive-originals',
  'memoive-originals',
  false,
  26214400,
  array['image/png','image/jpeg','image/gif','image/webp','image/avif','audio/webm','audio/mpeg','audio/mp4','audio/ogg','audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No browser role receives a policy. Only the Vercel server's service role can read or write.
