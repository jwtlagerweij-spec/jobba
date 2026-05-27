create table if not exists job_cache (
  id uuid default gen_random_uuid() primary key,
  cache_key text not null unique,
  results jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index if not exists job_cache_key_idx on job_cache (cache_key);
create index if not exists job_cache_expires_idx on job_cache (expires_at);
