-- Migration 001: Add new preference enrichment fields + per-match feedback
-- Run in the Supabase SQL editor on existing databases

-- Backfill fields that the API was already writing but weren't in the original schema
alter table public.job_preferences
  add column if not exists job_type              text default 'job',
  add column if not exists job_types             text[] default array['job'],
  add column if not exists experience_level      text default 'graduate',
  add column if not exists job_level             text default 'graduate',
  add column if not exists years_in_field        text default '0-2',
  add column if not exists years_total           text default '0-2';

-- New enrichment fields
alter table public.job_preferences
  add column if not exists salary_min            int,
  add column if not exists salary_max            int,
  add column if not exists work_arrangement      text[],
  add column if not exists company_size          text[],
  add column if not exists career_direction      text,
  add column if not exists dutch_proficiency     text,
  add column if not exists management_level      text;

-- Per-match user feedback (thumbs up / thumbs down)
alter table public.job_matches
  add column if not exists user_feedback smallint check (user_feedback in (-1, 1));
