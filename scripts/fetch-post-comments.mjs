#!/usr/bin/env node
/**
 * Fetches all comments for a Reddit post.
 * Usage: npm run fetch:post-comments -- 19dtsbz
 *        npm run fetch:post-comments -- 19dtsbz nutrition
 */
const USER_AGENT = 'theairlab:cli (Node.js)';

function flattenComments(children, depth = 0) {
  const result = [];
  if (!Array.isArray(children)) return result;
  for (const child of children) {
    if (child?.kind !== 't1' || !child.data) continue;
    const d = child.data;
    result.push({
      id: d.id ?? '',
      body: (d.body ?? '').slice(0, 1000),
      author: d.author ?? '[deleted]',
      score: d.score ?? 0,
      createdUtc: d.created_utc ?? 0,
      parentId: d.parent_id ?? '',
      depth: d.depth ?? depth,
      permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
    });
    const replies = d.replies;
    if (replies && typeof replies === 'object' && replies.data?.children) {
      result.push(...flattenComments(replies.data.children, (d.depth ?? depth) + 1));
    }
  }
  return result;
}

async function main() {
  const postId = process.argv[2];
  const subreddit = process.argv[3] ?? 'nutrition';
  if (!postId) {
    console.error('Usage: npm run fetch:post-comments -- <postId> [subreddit]');
    process.exit(1);
  }
  console.error(`Fetching comments for r/${subreddit} post ${postId}...\n`);
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=500`,
    { headers: { 'User-Agent': USER_AGENT } }
  );
  if (!res.ok) {
    throw new Error(`Reddit API returned ${res.status}`);
  }
  const data = await res.json();
  const commentListing = data?.[1];
  const children = commentListing?.data?.children ?? [];
  const comments = flattenComments(children);

  console.log(JSON.stringify({ postId, subreddit, comments }, null, 2));
  console.error(`\nFound ${comments.length} comments`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
