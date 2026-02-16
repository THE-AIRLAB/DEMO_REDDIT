#!/usr/bin/env node
/**
 * Fetches up to 500 posts from r/nutrition via Reddit's public listing API,
 * then upserts them into the Supabase `questions` table.
 *
 * Run: npm run fetch:nutrition-questions
 *      npm run fetch:nutrition-questions -- --limit 200 --sort top --time year
 *
 * Options:
 *   --limit <n>   Number of posts to fetch (default: 500, max: 500)
 *   --sort <s>    Sort order: new | top | hot (default: new)
 *   --time <t>    Time filter when sort=top: hour|day|week|month|year|all (default: all)
 *
 * Requires .env: SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const USER_AGENT = 'theairlab:fetch-nutrition (Node.js)';
const SUBREDDIT = 'nutrition';
const BATCH_SIZE = 100; // Reddit API max per request
const MAX_LIMIT = 500;
const RATE_LIMIT_MS = 1000; // 1s between requests

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: MAX_LIMIT, sort: 'new', time: 'all' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10);
    if (args[i] === '--sort' && args[i + 1]) opts.sort = args[++i];
    if (args[i] === '--time' && args[i + 1]) opts.time = args[++i];
  }
  opts.limit = Math.min(Math.max(opts.limit, 1), MAX_LIMIT);
  return opts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildUrl(sort, time, limit, after) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sort === 'top') params.set('t', time);
  if (after) params.set('after', after);
  return `https://www.reddit.com/r/${SUBREDDIT}/${sort}.json?${params}`;
}

async function fetchBatch(sort, time, limit, after) {
  const url = buildUrl(sort, time, limit, after);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429) throw new Error('Rate limited by Reddit — try again later.');
  if (!res.ok) throw new Error(`Reddit API returned ${res.status} for ${url}`);
  return res.json();
}

function extractPosts(data) {
  return (data?.data?.children ?? [])
    .map((c) => c?.data)
    .filter(Boolean)
    .filter((d) => d.id)
    .map((d) => ({
      id: d.id,
      subreddit: SUBREDDIT,
      title: d.title ?? '',
      selftext: d.selftext ?? '',
      url: d.url ?? '',
      score: d.score ?? 0,
      num_comments: d.num_comments ?? 0,
      author: d.author ?? '[deleted]',
      created_utc: d.created_utc ?? 0,
    }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { limit, sort, time } = parseArgs();
  console.log(
    `Fetching up to ${limit} posts from r/${SUBREDDIT} (sort=${sort}${sort === 'top' ? `, t=${time}` : ''})...`
  );

  const seen = new Set();
  const posts = [];
  let after = null;
  let page = 1;

  while (posts.length < limit) {
    const batchLimit = Math.min(BATCH_SIZE, limit - posts.length);
    process.stdout.write(`  Page ${page}: fetching ${batchLimit} posts...`);

    const data = await fetchBatch(sort, time, batchLimit, after);
    const batch = extractPosts(data);

    if (batch.length === 0) {
      console.log(' none returned.');
      break;
    }

    let added = 0;
    for (const post of batch) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        posts.push(post);
        added++;
      }
    }

    console.log(` +${added} (total: ${posts.length})`);
    after = data?.data?.after ?? null;

    if (!after) {
      console.log('  Reached end of listing.');
      break;
    }

    if (posts.length < limit) await sleep(RATE_LIMIT_MS);
    page++;
  }

  if (posts.length === 0) {
    console.log('No posts fetched. Nothing to save.');
    return;
  }

  // Upsert in chunks of 100 to stay within Supabase request limits
  console.log(`\nUpserting ${posts.length} posts into Supabase...`);
  const CHUNK = 100;
  let saved = 0;

  for (let i = 0; i < posts.length; i += CHUNK) {
    const chunk = posts.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('questions')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`  Error upserting rows ${i}–${i + chunk.length - 1}: ${error.message}`);
      process.exit(1);
    }
    saved += chunk.length;
    console.log(`  Saved ${saved}/${posts.length}`);
  }

  console.log(`\nDone. ${saved} questions stored in the database.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
