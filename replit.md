# SecondBrain

A web-based second brain system that transforms bookmarked tweets into a structured, navigable knowledge base with Obsidian-style graph visualization.

## Architecture

- **Frontend**: React + Vite, styled with Tailwind CSS v4, using shadcn/ui components
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)

## Data Model

- `tweet_notes` — Individual tweet bookmarks with metadata (author, content, tags, thread position, links, source, quoted tweet content/author, media URLs, author profile image URL)
- `sync_logs` — Track sync operations and their status
- `settings` — User configuration (poll interval, filename template, etc.)

## Key Files

- `shared/schema.ts` — Drizzle schema definitions + Zod validation
- `server/db.ts` — Database connection pool
- `server/storage.ts` — Storage interface (DatabaseStorage class with CRUD operations)
- `server/routes.ts` — API routes prefixed with `/api`
- `client/src/lib/api.ts` — Frontend API client
- `client/src/pages/Dashboard.tsx` — Overview with clickable stat cards
- `client/src/pages/TweetsPage.tsx` — All tweets view with search/filter
- `client/src/pages/AuthorsPage.tsx` — All authors grid view
- `client/src/pages/FilesPage.tsx` — Markdown files listing (author hubs + tweet notes)
- `client/src/pages/TagsPage.tsx` — All tags with links to filtered tweets
- `client/src/pages/BookmarksView.tsx` — Tweet cards with search, filter, import, delete
- `client/src/pages/GraphView.tsx` — Force-directed graph visualization (react-force-graph-2d)
- `client/src/pages/Settings.tsx` — Configuration page

## API Endpoints

- `GET /api/tweets` — List all tweets (supports `?search=`, `?tag=`, and `?source=` query params)
- `POST /api/tweets` — Import single tweet
- `POST /api/tweets/bulk` — Bulk import tweets
- `DELETE /api/tweets/:id` — Delete a tweet
- `GET /api/stats` — Dashboard statistics (uses `getRealAuthor()` to extract true tweet authors from URL/RT content, filters out own username)
- `GET /api/graph` — Graph nodes and edges (authors, hashtags, threads, tweets with source-based coloring; uses `getRealAuthor()` for proper author attribution)
- `GET /api/sync-logs` — Recent sync history
- `GET /api/settings` — Get current settings
- `PUT /api/settings` — Update settings
- `GET /api/x-account/status` — Check X account connection status
- `POST /api/x-account/verify` — Verify bearer token + username (uses App-Only auth via `/2/users/by/username`)
- `GET /api/export/:id` — Download single note as Markdown
- `GET /api/export` — Get all notes as JSON
- `GET /api/export/zip/download` — Download all notes as a ZIP file

## X/Twitter Integration

- Bearer Token: App-Only auth for profile verification via `/2/users/by/username/:username`
- OAuth 2.0 PKCE: User-level auth for bookmark access via `/2/users/:id/bookmarks`
- `server/xauth.ts` — OAuth PKCE flow (authorize, callback, token refresh, bookmark fetch)
- Endpoints: `GET /api/x-auth/status`, `GET /api/x-auth/authorize`, `GET /api/x-auth/callback`
- Public Sync: `POST /api/sync/public` — fetches user tweets/retweets and likes using Bearer Token (no OAuth)
- Bookmark Sync: `POST /api/sync/bookmarks` — fetches private bookmarks (requires OAuth)
- `fetchUserTweets()` and `fetchUserLikes()` in xauth.ts for public sync
- Requires X_CLIENT_ID and X_CLIENT_SECRET environment variables for OAuth bookmark sync
- Settings UI: XAccountCard (public sync) and BookmarkSyncCard (OAuth bookmarks) as separate cards
- Dashboard: Two sync buttons — "Sync Public" and "Sync Bookmarks"

## GitHub Integration (Obsidian Sync)

- Uses Replit GitHub connector (OAuth via `@octokit/rest`)
- `server/github.ts` — GitHub client with token refresh from Replit connector
- Push notes directly to GitHub repo (e.g. `seanmodd/brainmirror`)
- Obsidian syncs from the GitHub repo automatically
- Endpoints: `GET /api/github/status`, `POST /api/github/push`
- Dashboard: "Sync to GitHub" button (visible when GitHub is connected) uses persisted repo/folder settings
- Settings: `githubRepo` and `githubFolder` fields persisted in settings table

## Obsidian Export

- Notes exported as Obsidian-compatible Markdown with YAML frontmatter
- Wiki-links for authors (`[[@handle]]`) and hashtags (`[[#tag]]`)
- ZIP download for bulk export into Obsidian vault
- Individual file download also available

## Style

- Dark mode interface (bg #0F0F0F, surface #1A1A1A)
- Primary purple (#7C3AED), accent lavender (#A78BFA)
- Inter + JetBrains Mono fonts
