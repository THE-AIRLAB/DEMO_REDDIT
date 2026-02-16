#!/usr/bin/env node
/**
 * Fetches gut health questions from r/nutrition + their comments from Reddit,
 * then upserts them into Supabase (questions + comments tables).
 *
 * Run: npm run sync:gut-health-to-db
 *      npm run sync:gut-health-to-db -- 10   (sync first 10 questions only)
 *
 * Requires .env: SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const USER_AGENT = 'theairlab:sync (Node.js)';
const SUBREDDIT = 'nutrition';
const SEARCH_URL =
  'https://www.reddit.com/r/nutrition/search.json?q=gut+health&restrict_sr=on&limit=25&sort=relevance';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(url, key);

function flattenComments(children, depth = 0) {
  const result = [];
  if (!Array.isArray(children)) return result;
  for (const child of children) {
    if (child?.kind !== 't1' || !child.data) continue;
    const d = child.data;
    result.push({
      id: d.id ?? '',
      body: (d.body ?? '').slice(0, 10000),
      author: d.author ?? '[deleted]',
      score: d.score ?? 0,
      created_utc: d.created_utc ?? 0,
      parent_id: d.parent_id ?? null,
      depth: d.depth ?? depth,
      permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : null,
    });
    const replies = d.replies;
    if (replies && typeof replies === 'object' && replies.data?.children) {
      result.push(...flattenComments(replies.data.children, (d.depth ?? depth) + 1));
    }
  }
  return result;
}

async function fetchGutHealthQuestions() {
  const res = await fetch(SEARCH_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Reddit search returned ${res.status}`);
  const data = await res.json();
  const children = data?.data?.children ?? [];
  return children
    .map((c) => c?.data)
    .filter(Boolean)
    .map((d) => ({
      id: d.id ?? '',
      subreddit: SUBREDDIT,
      title: d.title ?? '',
      selftext: d.selftext ?? '',
      url: d.url ?? '',
      score: d.score ?? 0,
      num_comments: d.num_comments ?? 0,
      author: d.author ?? '[deleted]',
      created_utc: d.created_utc ?? 0,
    }))
    .filter((q) => q.id);
}

async function fetchCommentsForPost(postId) {
  const res = await fetch(
    `https://www.reddit.com/r/${SUBREDDIT}/comments/${postId}.json?limit=500`,
    { headers: { 'User-Agent': USER_AGENT } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const children = data?.[1]?.data?.children ?? [];
  return flattenComments(children).map((c) => ({
    ...c,
    question_id: postId,
  }));
}

async function main() {
  const limit = Math.min(parseInt(process.argv[2], 10) || 5, 25);
  console.log(`Fetching up to ${limit} gut health questions from r/${SUBREDDIT}...`);

  const questions = await fetchGutHealthQuestions();
  const toSync = questions.slice(0, limit);
  console.log(`Upserting ${toSync.length} questions...`);

  const questionRows = toSync.map((q) => ({
    id: q.id,
    subreddit: q.subreddit,
    title: q.title,
    selftext: q.selftext,
    url: q.url,
    score: q.score,
    num_comments: q.num_comments,
    author: q.author,
    created_utc: q.created_utc,
  }));

  const { error: qErr } = await supabase.from('questions').upsert(questionRows, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });
  if (qErr) {
    console.error('Questions upsert error:', qErr.message);
    process.exit(1);
  }
  console.log(`  -> ${toSync.length} questions saved.`);

  let totalComments = 0;
  for (const q of toSync) {
    process.stdout.write(`  Fetching comments for "${q.title.slice(0, 40)}..."`);
    const comments = await fetchCommentsForPost(q.id);
    if (comments.length === 0) {
      console.log(' 0');
      continue;
    }
    const rows = comments.map((c) => ({
      id: c.id,
      question_id: c.question_id,
      body: c.body,
      author: c.author,
      score: c.score,
      created_utc: c.created_utc,
      parent_id: c.parent_id,
      depth: c.depth,
      permalink: c.permalink,
    }));
    const { error: cErr } = await supabase.from('comments').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (cErr) {
      console.error('\nComments upsert error:', cErr.message);
      continue;
    }
    totalComments += rows.length;
    console.log(` ${rows.length}`);
  }

  console.log(`\nDone. ${toSync.length} questions, ${totalComments} comments in DB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
