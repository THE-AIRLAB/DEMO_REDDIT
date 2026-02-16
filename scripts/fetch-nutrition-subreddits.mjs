#!/usr/bin/env node
/**
 * Fetches nutrition-related subreddits from Reddit's public API.
 * Same list as the app's GET /api/nutrition-subreddits endpoint.
 * Run: npm run fetch:nutrition-subreddits
 */

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

const USER_AGENT = 'theairlab:nutrition-subreddits-cli (Node.js)';

async function fetchSubredditAbout(name) {
  const res = await fetch(`https://www.reddit.com/r/${name}/about.json`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const d = data?.data;
  if (!d || d.subreddit === false) return null;
  return {
    id: d.id ? `t5_${d.id}` : undefined,
    name: d.display_name,
    title: d.title,
    description: d.public_description || undefined,
    subscribersCount: d.subscribers,
    isNsfw: d.over18 ?? false,
  };
}

async function main() {
  console.log('Fetching nutrition subreddits from Reddit...\n');
  const results = await Promise.allSettled(
    NUTRITION_SUBREDDIT_NAMES.map((name) => fetchSubredditAbout(name))
  );

  const subreddits = results
    .filter((r) => r.status === 'fulfilled' && r.value != null)
    .map((r) => r.value);

  const out = { subreddits };
  console.log(JSON.stringify(out, null, 2));
  console.error(`\nFound ${subreddits.length}/${NUTRITION_SUBREDDIT_NAMES.length} subreddits`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
