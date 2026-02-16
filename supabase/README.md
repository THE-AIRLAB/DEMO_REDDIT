# Supabase migrations

## Apply the schema

### Option 1: Supabase Dashboard (easiest)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Paste the contents of `migrations/001_questions_and_comments.sql`.
4. Click **Run**.

### Option 2: Supabase CLI

If you use [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

(or link the project and run migrations as per Supabase docs)

## Tables

- **`questions`** – Reddit posts (e.g. gut health questions). Primary key is the Reddit post id (e.g. `19dtsbz`).
- **`comments`** – Reddit comments on those posts. `question_id` references `questions(id)`. Deleting a question cascades to its comments.
