-- Migration 003: Fix source/step constraints and create job_cache table
-- Run in the Supabase SQL editor

-- Fix jobs.source: add arbeitnow, themuse, jooble, reed (used by aggregator but missing from constraint)
alter table public.jobs
  drop constraint if exists jobs_source_check;
alter table public.jobs
  add constraint jobs_source_check
  check (source in ('adzuna', 'nvb', 'intermediair', 'manual', 'jobbird', 'arbeitnow', 'themuse', 'jooble', 'reed'));

-- Fix pipeline_logs.step: add global_crawl (used by /api/cron/crawl)
alter table public.pipeline_logs
  drop constraint if exists pipeline_logs_step_check;
alter table public.pipeline_logs
  add constraint pipeline_logs_step_check
  check (step in ('fetch', 'score', 'email', 'scan_now', 'rescore', 'global_crawl'));

-- Create job_cache table (used by aggregator.ts for 30-min per-term caching, but never defined in schema)
create table if not exists public.job_cache (
  cache_key  text        primary key,
  results    jsonb       not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Allow the service role to read/write cache entries
alter table public.job_cache enable row level security;
create policy "Service role full access" on public.job_cache
  using (true)
  with check (true);
