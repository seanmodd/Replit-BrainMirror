# SecondBrain

A web-based second brain system that transforms bookmarked tweets into a structured, navigable knowledge base with Obsidian-style graph visualization.

## Architecture

- **Frontend**: React + Vite, styled with Tailwind CSS v4, using shadcn/ui components
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)

## Data Model

- `tweet_notes` — Individual tweet bookmarks with metadata (author, content, tags, thread position, links)
- `sync_logs` — Track sync operations and their status
- `settings` — User configuration (vault path, poll interval, filename template, etc.)

## Key Files

- `shared/schema.ts` — Drizzle schema definitions + Zod validation
- `server/db.ts` — Database connection pool
- `server/storage.ts` — Storage interface (DatabaseStorage class with CRUD operations)
- `server/routes.ts` — API routes prefixed with `/api`
- `client/src/lib/api.ts` — Frontend API client
- `client/src/pages/Dashboard.tsx` — Overview with stats
- `client/src/pages/BookmarksView.tsx` — Tweet cards with search, filter, import, delete
- `client/src/pages/GraphView.tsx` — Force-directed graph visualization (react-force-graph-2d)
- `client/src/pages/Settings.tsx` — Configuration page

## API Endpoints

- `GET /api/tweets` — List all tweets (supports `?search=` and `?tag=` query params)
- `POST /api/tweets` — Import single tweet
- `POST /api/tweets/bulk` — Bulk import tweets
- `DELETE /api/tweets/:id` — Delete a tweet
- `GET /api/stats` — Dashboard statistics
- `GET /api/graph` — Graph nodes and edges for visualization
- `GET /api/sync-logs` — Recent sync history
- `GET /api/settings` — Get current settings
- `PUT /api/settings` — Update settings

## Style

- Dark mode interface (bg #0F0F0F, surface #1A1A1A)
- Primary purple (#7C3AED), accent lavender (#A78BFA)
- Inter + JetBrains Mono fonts
