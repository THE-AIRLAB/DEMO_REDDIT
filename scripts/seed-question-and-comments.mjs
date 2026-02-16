#!/usr/bin/env node
/**
 * Test script: insert one question and a few comments into Supabase.
 * Run: npm run seed:question-comments
 * Requires .env with SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const QUESTION_ID = 'test-question-' + Date.now();

const question = {
  id: QUESTION_ID,
  subreddit: 'nutrition',
  title: 'Test: What foods can improve gut health?',
  selftext: 'Sample post body for testing the database.',
  url: 'https://www.reddit.com/r/nutrition/comments/example/',
  score: 42,
  num_comments: 2,
  author: 'test_script',
  created_utc: Math.floor(Date.now() / 1000),
};

const comments = [
  {
    id: 'test-comment-1-' + Date.now(),
    question_id: QUESTION_ID,
    body: 'First test comment: more fiber and fermented foods.',
    author: 'test_user_1',
    score: 10,
    created_utc: Math.floor(Date.now() / 1000),
    parent_id: 't3_' + QUESTION_ID,
    depth: 0,
    permalink: 'https://www.reddit.com/r/nutrition/comments/example/c1/',
  },
  {
    id: 'test-comment-2-' + Date.now(),
    question_id: QUESTION_ID,
    body: 'Second test comment: kefir and kimchi are great.',
    author: 'test_user_2',
    score: 5,
    created_utc: Math.floor(Date.now() / 1000) + 1,
    parent_id: 't3_' + QUESTION_ID,
    depth: 0,
    permalink: 'https://www.reddit.com/r/nutrition/comments/example/c2/',
  },
];

async function main() {
  console.log('Inserting test question...');
  const { data: qData, error: qErr } = await supabase
    .from('questions')
    .insert(question)
    .select()
    .single();

  if (qErr) {
    console.error('Question insert error:', qErr.message);
    process.exit(1);
  }
  console.log('Question inserted:', qData.id);

  console.log('Inserting test comments...');
  const { data: cData, error: cErr } = await supabase
    .from('comments')
    .insert(comments)
    .select();

  if (cErr) {
    console.error('Comments insert error:', cErr.message);
    process.exit(1);
  }
  console.log('Comments inserted:', cData.length);

  console.log('\nDone. Check your Supabase Table Editor for questions and comments.');
}

main();
