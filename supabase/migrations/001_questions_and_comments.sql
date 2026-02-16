-- Questions (Reddit posts, e.g. gut health questions from r/nutrition)
create table if not exists public.questions (
  id text primary key,
  subreddit text not null default 'nutrition',
  title text not null,
  selftext text,
  url text,
  score int not null default 0,
  num_comments int not null default 0,
  author text,
  created_utc bigint not null,
  created_at timestamptz not null default now()
);

-- Comments on questions (Reddit comments)
create table if not exists public.comments (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  body text not null,
  author text,
  score int not null default 0,
  created_utc bigint not null,
  parent_id text,
  depth int not null default 0,
  permalink text,
  created_at timestamptz not null default now()
);

-- Indexes for common lookups
create index if not exists idx_questions_subreddit on public.questions(subreddit);
create index if not exists idx_questions_created_utc on public.questions(created_utc desc);
create index if not exists idx_comments_question_id on public.comments(question_id);
create index if not exists idx_comments_created_utc on public.comments(created_utc desc);

-- Optional: RLS (Row Level Security) - enable if you want per-user or anon access rules
-- alter table public.questions enable row level security;
-- alter table public.comments enable row level security;

comment on table public.questions is 'Reddit posts/questions (e.g. gut health from r/nutrition)';
comment on table public.comments is 'Reddit comments on questions';
