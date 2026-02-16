export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type NutritionSubredditInfo = {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  subscribersCount?: number;
  isNsfw?: boolean;
};

export type NutritionSubredditsResponse = {
  subreddits: NutritionSubredditInfo[];
};

export type GutHealthPostInfo = {
  id: string;
  title: string;
  selftext: string;
  url: string;
  score: number;
  numComments: number;
  author: string;
  createdUtc: number;
};

export type GutHealthQuestionsResponse = {
  posts: GutHealthPostInfo[];
};

export type PostCommentInfo = {
  id: string;
  body: string;
  author: string;
  score: number;
  createdUtc: number;
  parentId: string;
  depth: number;
  permalink: string;
};

export type PostCommentsResponse = {
  postId: string;
  comments: PostCommentInfo[];
};
