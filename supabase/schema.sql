-- ============================================================
-- Jobra — Full Database Schema
-- Run this once in the Supabase SQL editor (paste entire file)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────
create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  email                     text not null,
  full_name                 text,
  resume_url                text,
  resume_text               text,
  resume_extracted_keywords text,
  ai_generated_titles       text[],
  onboarding_done           boolean default false,
  ai_credits_remaining      int default 3,
  -- GDPR compliance fields
  consent_accepted_at       timestamptz,     -- when user accepted Terms + Privacy Policy
  consent_version           text,            -- version of T&C they agreed to (e.g. '1.0')
  email_unsubscribed_at     timestamptz,     -- set when user unsubscribes from digest
  account_deleted_at        timestamptz,     -- soft-delete marker (hard delete via cascade)
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function to safely decrement credits (never below 0)
create or replace function public.decrement_credits(uid uuid)
returns int language plpgsql security definer as $$
declare
  current_credits int;
begin
  select ai_credits_remaining into current_credits
  from public.profiles where id = uid for update;
  if current_credits > 0 then
    update public.profiles
    set ai_credits_remaining = ai_credits_remaining - 1,
        updated_at = now()
    where id = uid;
    return current_credits - 1;
  end if;
  return 0;
end;
$$;

-- ── job_preferences ───────────────────────────────────────
create table public.job_preferences (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  job_titles           text[],
  location             text,
  radius_km            int default 50,
  remote_only          boolean default false,
  example_companies    text[],
  sector_preferences   text[],
  use_resume_for_search boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique(user_id)
);

-- ── jobs ──────────────────────────────────────────────────
create table public.jobs (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null,
  source       text not null check (source in ('adzuna', 'nvb', 'intermediair')),
  title        text not null,
  company      text,
  location     text,
  description  text,
  url          text not null,
  salary_min   int,
  salary_max   int,
  posted_at    timestamptz,
  category     text check (category in ('data', 'consulting', 'ai-tech', 'strategy', 'other')),
  is_remote    boolean default false,
  language     text default 'nl',
  fetched_at   timestamptz default now(),
  unique(external_id, source)
);

create index jobs_posted_at_idx on public.jobs (posted_at desc);
create index jobs_category_idx  on public.jobs (category);
create index jobs_remote_idx    on public.jobs (is_remote);

-- ── job_matches ───────────────────────────────────────────
create table public.job_matches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  job_id           uuid not null references public.jobs(id) on delete cascade,
  batch_date       date not null default current_date,
  fit_score        int check (fit_score between 1 and 10),
  fit_explanation  text,
  email_sent       boolean default false,
  user_viewed      boolean default false,
  created_at       timestamptz default now(),
  unique(user_id, job_id, batch_date)
);

create index job_matches_user_date_idx on public.job_matches (user_id, batch_date desc);

-- ── cover_letters ─────────────────────────────────────────
create table public.cover_letters (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid not null references public.jobs(id) on delete cascade,
  content    text not null,
  tone       text default 'warm' check (tone in ('formal', 'warm')),
  version    int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, job_id)
);

-- ── tailored_resumes ──────────────────────────────────────
create table public.tailored_resumes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  job_id         uuid not null references public.jobs(id) on delete cascade,
  original_text  text,
  tailored_text  text not null,
  version        int default 1,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id, job_id)
);

-- ── applications ──────────────────────────────────────────
create table public.applications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid not null references public.jobs(id) on delete cascade,
  status     text default 'saved' check (status in ('saved','applied','interviewing','offered','rejected')),
  applied_at timestamptz,
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, job_id)
);

-- ── email_logs ────────────────────────────────────────────
create table public.email_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  batch_date        date not null,
  sent_at           timestamptz default now(),
  job_count         int,
  resend_message_id text
);

-- ── profile_clarifications ────────────────────────────────
create table public.profile_clarifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  question      text not null,
  question_hash text not null,
  answer        text,
  context_type  text check (context_type in ('job', 'skill', 'general')),
  context_ref   text,
  dismissed     boolean default false,
  created_at    timestamptz default now(),
  unique(user_id, question_hash)
);

-- ── pipeline_logs ─────────────────────────────────────────
create table public.pipeline_logs (
  id         uuid primary key default gen_random_uuid(),
  run_date   date not null default current_date,
  step       text check (step in ('fetch', 'score', 'email', 'scan_now')),
  user_id    uuid references public.profiles(id) on delete set null,
  status     text check (status in ('ok', 'error')),
  message    text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles               enable row level security;
alter table public.job_preferences        enable row level security;
alter table public.job_matches            enable row level security;
alter table public.cover_letters          enable row level security;
alter table public.tailored_resumes       enable row level security;
alter table public.applications           enable row level security;
alter table public.email_logs             enable row level security;
alter table public.profile_clarifications enable row level security;
alter table public.pipeline_logs          enable row level security;
-- jobs: public read, no RLS needed for read
alter table public.jobs                   enable row level security;

-- profiles
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- job_preferences
create policy "Users can manage own preferences" on public.job_preferences for all using (auth.uid() = user_id);

-- jobs — public read, only service role can write
create policy "Anyone can read jobs" on public.jobs for select using (true);

-- job_matches
create policy "Users can view own matches" on public.job_matches for select using (auth.uid() = user_id);
create policy "Users can update own matches" on public.job_matches for update using (auth.uid() = user_id);

-- cover_letters
create policy "Users can manage own cover letters" on public.cover_letters for all using (auth.uid() = user_id);

-- tailored_resumes
create policy "Users can manage own tailored resumes" on public.tailored_resumes for all using (auth.uid() = user_id);

-- applications
create policy "Users can manage own applications" on public.applications for all using (auth.uid() = user_id);

-- email_logs
create policy "Users can view own email logs" on public.email_logs for select using (auth.uid() = user_id);

-- profile_clarifications
create policy "Users can manage own clarifications" on public.profile_clarifications for all using (auth.uid() = user_id);

-- pipeline_logs — service role only (no user policy)
