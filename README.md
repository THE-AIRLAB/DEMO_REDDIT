## Devvit React Starter

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Hono](https://hono.dev/): For backend logic
- [Tailwind](https://tailwindcss.com/): For styles
- [TypeScript](https://www.typescriptlang.org/): For type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Supabase

This project can use [Supabase](https://supabase.com) for database and auth.

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL` (your project URL) and `SUPABASE_ANON_KEY` (from Supabase Dashboard → Project Settings → API). Optionally use `SUPABASE_SERVICE_ROLE_KEY` for server-side admin access.
3. Use `getSupabase()` from `src/server/lib/supabase.ts` in server routes.

For production (Devvit deploy), configure these environment variables in your hosting/Devvit dashboard if supported.

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app
