create table if not exists public.device_push_tokens (
  expo_push_token text primary key,
  platform text not null,
  device_name text,
  app_version text,
  account_user_id uuid null,
  enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists device_push_tokens_enabled_idx
  on public.device_push_tokens (enabled);

alter table public.device_push_tokens enable row level security;

create policy "anon can upsert push tokens"
  on public.device_push_tokens
  for insert
  to anon, authenticated
  with check (true);

create policy "anon can update own push token row"
  on public.device_push_tokens
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "service role can read push tokens"
  on public.device_push_tokens
  for select
  to service_role
  using (true);
