# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

## Environment Setup

Requires a `.env` file with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack**: Next.js 16 (App Router) + Supabase (auth + PostgreSQL) + Jikan API v4 + Tailwind CSS v4

### Data Flow

- **Content data**: Fetched from Jikan API v4 (`https://api.jikan.moe/v4`) via `lib/jikan-service.ts`. No API key required. Pages cache responses: 24h for detail pages, 1h for list pages.
- **User data**: Stored in Supabase PostgreSQL. All user operations go through Next.js Server Actions in `lib/actions/`.
- **Authentication**: Supabase Auth (email/password + Google OAuth). Session managed via cookies using `@supabase/ssr`. Middleware at `middleware.ts` → `lib/supabase/middleware.ts` protects `/profile` and `/lists`; redirects authenticated users away from `/login` and `/register`.

### Server vs Client Components

Layout components (`Sidebar`, `Topbar`) are split into server shells and `*Client.tsx` client counterparts to minimize client bundles. Server Actions (`"use server"`) handle all mutations.

### Supabase Tables

- `profiles` — user profile data (name, avatar, roles)
- `media` — cached anime/manga metadata (mal_id, title, image, type, tags)
- `user_anime_progress` — per-user tracking (status, current_episode)
- `lists` + `list_media` — custom user lists and their media associations
- `favorites` — quick-add favorites
- `hentai` — private adult content vault (separate from main media)

### Key Files

| File | Purpose |
|------|---------|
| `lib/jikan-service.ts` | All Jikan API calls with caching |
| `lib/actions/auth.ts` | login, register, logout, Google OAuth |
| `lib/actions/lists.ts` | List CRUD, add/remove media, get progress |
| `lib/actions/media.ts` | Toggle favorites |
| `lib/actions/hentai.ts` | Adult content vault CRUD |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `types/jikan.ts` | Jikan API response types |

### Route Structure

- `/` — Home
- `/anime`, `/manga` — Browse with filters (genre, status, season, sort)
- `/anime/[slug]`, `/manga/[slug]` — Detail pages (slug = MAL ID)
- `/anime/[slug]/characters` — Characters for an anime
- `/characters`, `/characters/[slug]` — Character search and detail
- `/favorites`, `/lists`, `/profile` — Protected user pages
- `/hentai` — Private adult content vault
- `/(auth)/login`, `/(auth)/register` — Auth pages

### Image Domains

`next.config.ts` whitelists: `lh3.googleusercontent.com`, `res.cloudinary.com`, `myanimelist.net`
