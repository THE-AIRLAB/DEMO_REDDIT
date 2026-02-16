import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  GutHealthQuestionsResponse,
  IncrementResponse,
  InitResponse,
  NutritionSubredditsResponse,
  PostCommentInfo,
  PostCommentsResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

/** Curated list of nutrition-related subreddit names (Reddit API has no subreddit search in Devvit client) */
const NUTRITION_SUBREDDIT_NAMES = [
  'nutrition',
  'NutritionFacts',
  'diet',
  'HealthyFood',
  'LoseIt',
  'EatCheapAndHealthy',
  'MealPrepSunday',
  'CICO',
  'intermittentfasting',
  'keto',
  'vegetarian',
  'vegan',
  'PlantBasedDiet',
  'weightloss',
  'gainit',
  'supplements',
  'Cooking',
  'recipes',
  'food',
  'Fitness',
  'bodyweightfitness',
];

api.get('/nutrition-subreddits', async (c) => {
  try {
    const results = await Promise.allSettled(
      NUTRITION_SUBREDDIT_NAMES.map((name) =>
        reddit.getSubredditInfoByName(name)
      )
    );

    const subreddits = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof reddit.getSubredditInfoByName>>> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((info) => info?.name)
      .map((info) => ({
        id: info.id,
        name: info.name,
        title: info.title,
        description:
          typeof info.description === 'string'
            ? info.description
            : undefined,
        subscribersCount: info.subscribersCount,
        isNsfw: info.isNsfw,
      }));

    return c.json<NutritionSubredditsResponse>({ subreddits });
  } catch (error) {
    console.error('API nutrition-subreddits error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch subreddits';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

const REDDIT_SEARCH_USER_AGENT = 'theairlab:dev (Devvit web app)';

api.get('/gut-health-questions', async (c) => {
  try {
    const res = await fetch(
      'https://www.reddit.com/r/nutrition/search.json?q=gut+health&restrict_sr=on&limit=25&sort=relevance',
      { headers: { 'User-Agent': REDDIT_SEARCH_USER_AGENT } }
    );
    if (!res.ok) {
      throw new Error(`Reddit API returned ${res.status}`);
    }
    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: RedditPostData }> };
    };
    const children = data?.data?.children ?? [];
    const posts = children
      .map((c) => c.data)
      .filter((d): d is NonNullable<typeof d> => d != null)
      .map((d) => ({
        id: d.id ?? '',
        title: d.title ?? '',
        selftext: d.selftext ?? '',
        url: d.url ?? '',
        score: d.score ?? 0,
        numComments: d.num_comments ?? 0,
        author: d.author ?? '[deleted]',
        createdUtc: d.created_utc ?? 0,
      }));

    return c.json<GutHealthQuestionsResponse>({ posts });
  } catch (error) {
    console.error('API gut-health-questions error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch questions';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

type RedditPostData = {
  id?: string;
  title?: string;
  selftext?: string;
  url?: string;
  score?: number;
  num_comments?: number;
  author?: string;
  created_utc?: number;
};

type RedditCommentChild = {
  kind?: string;
  data?: {
    id?: string;
    body?: string;
    author?: string;
    score?: number;
    created_utc?: number;
    parent_id?: string;
    permalink?: string;
    replies?: '' | { data?: { children?: RedditCommentChild[] } };
    depth?: number;
  };
};

function flattenComments(
  children: RedditCommentChild[] | undefined,
  depth = 0
): PostCommentInfo[] {
  const result: PostCommentInfo[] = [];
  if (!Array.isArray(children)) return result;
  for (const child of children) {
    if (child?.kind !== 't1' || !child.data) continue;
    const d = child.data;
    result.push({
      id: d.id ?? '',
      body: d.body ?? '',
      author: d.author ?? '[deleted]',
      score: d.score ?? 0,
      createdUtc: d.created_utc ?? 0,
      parentId: d.parent_id ?? '',
      depth: d.depth ?? depth,
      permalink: d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : '',
    });
    const replies = d.replies;
    if (replies && typeof replies === 'object' && replies.data?.children) {
      result.push(
        ...flattenComments(replies.data.children, (d.depth ?? depth) + 1)
      );
    }
  }
  return result;
}

api.get('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  const subreddit = c.req.query('subreddit') ?? 'nutrition';
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=500`,
      { headers: { 'User-Agent': REDDIT_SEARCH_USER_AGENT } }
    );
    if (!res.ok) {
      throw new Error(`Reddit API returned ${res.status}`);
    }
    const data = (await res.json()) as [
      { data?: { children?: unknown[] } },
      { data?: { children?: RedditCommentChild[] } },
    ];
    const commentListing = data?.[1];
    const children = commentListing?.data?.children ?? [];
    const comments = flattenComments(children);

    return c.json<PostCommentsResponse>({ postId, comments });
  } catch (error) {
    console.error('API post comments error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch comments';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});
