#!/usr/bin/env node
/**
 * Fetches questions related to gut health from r/nutrition via Reddit's public search API.
 * Run: npm run fetch:gut-health-questions
 */

const USER_AGENT = 'theairlab:cli (Node.js)';
const SEARCH_URL =
  'https://www.reddit.com/r/nutrition/search.json?q=gut+health&restrict_sr=on&limit=25&sort=relevance';

async function main() {
  console.error('Fetching gut health questions from r/nutrition...\n');
  const res = await fetch(SEARCH_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Reddit API returned ${res.status}`);
  }
  const data = await res.json();
  const children = data?.data?.children ?? [];
  const posts = children
    .map((c) => c?.data)
    .filter(Boolean)
    .map((d) => ({
      id: d.id ?? '',
      title: d.title ?? '',
      selftext: (d.selftext ?? '').slice(0, 500),
      url: d.url ?? '',
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
      author: d.author ?? '[deleted]',
      createdUtc: d.created_utc ?? 0,
    }));

  console.log(JSON.stringify({ posts }, null, 2));
  console.error(`\nFound ${posts.length} posts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
