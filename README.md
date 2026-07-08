# Watch.local — Minimal YouTube Learning App Implementation Brief

## 1. Product Summary

Build a local-first web app named **Watch.local**: a distraction-free YouTube viewer focused only on videos from the user's subscriptions.

The app should be similar in spirit to the local newsletter reader project: simple, private, Dockerized, optimized for daily learning, and hosted locally behind a memorable development domain.

The first version should not attempt to recreate YouTube. It should intentionally remove noisy surfaces such as recommendations, Shorts feeds, trending pages, comments, infinite homepage suggestions, and unrelated search results.

## 2. Core Goal

Create a clean local app that lets the user:

1. Log in with their Google / YouTube account.
2. See recent videos only from their subscribed channels.
3. Open and watch videos in a minimal viewer.
4. Save selected videos for future reference in a local library.
5. Use the app at `http://watch.local` or `http://watch.localhost` through Docker.

## 3. MVP Scope

### Included in v1

- Google OAuth login.
- YouTube Data API integration.
- Subscription-based video feed.
- Minimal dashboard with subscription videos only.
- Save / unsave video locally.
- Saved videos page.
- Video detail / watch page using YouTube embed.
- Open original video on YouTube.
- Local database persistence.
- Dockerized local setup.
- Tailwind CSS + shadcn/ui interface.
- Light / dark mode.

### Excluded from v1

- YouTube comments.
- YouTube recommendations.
- Shorts-specific feed.
- Trending / Explore / Home feed.
- Uploading videos.
- Managing channel subscriptions.
- Writing to YouTube Watch Later.
- Syncing saved videos across devices.
- Multi-user account support beyond the local authenticated user.
- Browser extension.
- Mobile native app.

## 4. Important API Notes

Use the **YouTube Data API v3**.

For private user data such as the authenticated user's subscriptions, OAuth is required. API keys alone are not enough for account-specific subscription data.

Recommended OAuth scope for v1:

```txt
https://www.googleapis.com/auth/youtube.readonly
```

This allows the app to read the user's YouTube account data without requesting write permissions.

Do **not** use a service account for normal user login. YouTube Data API does not support service-account access to a regular user's YouTube account.

For local development, prefer a standard localhost redirect URI such as:

```txt
http://localhost:3000/api/auth/callback/google
```

Then expose the app through `watch.localhost` or `watch.local` for user-facing access. OAuth redirect behavior should be tested carefully because Google OAuth redirect URI validation can be strict.

Recommended approach:

- Use `localhost` for the OAuth callback during development.
- Use `watch.localhost` as the nicer browser entry point if possible.
- Treat `watch.local` as optional because `.local` can conflict with mDNS behavior on some systems.

## 5. Suggested Tech Stack

### Frontend / App Framework

Use **Next.js App Router**.

Reasons:

- Works well for local full-stack apps.
- API routes/server actions can safely handle OAuth tokens server-side.
- Good fit for Tailwind and shadcn/ui.
- Easy Docker deployment.

### UI

- Tailwind CSS
- shadcn/ui
- lucide-react icons
- next-themes for light / dark mode

### Auth

Use **Auth.js / NextAuth** with Google provider.

Store tokens securely server-side. Do not expose refresh tokens to the browser.

### Database

Use **PostgreSQL** in Docker for a realistic local app.

Use **Prisma** as ORM.

Alternative for a simpler local-only build: SQLite + Prisma. However, since the newsletter app was intended to be Dockerized, PostgreSQL keeps the architecture closer to production-like local development.

### Background / Sync Jobs

For v1, avoid a complex job queue.

Use simple server-side sync endpoints:

- Sync on first login.
- Manual refresh button.
- Optional periodic refresh while the app is open.

Later versions can add a queue such as BullMQ + Redis if needed.

## 6. High-Level Architecture

```txt
Browser
  -> Next.js UI
  -> Next.js API routes / server actions
  -> Auth.js Google OAuth
  -> YouTube Data API v3
  -> PostgreSQL via Prisma
```

### Main Modules

```txt
src/
  app/
    page.tsx
    login/page.tsx
    feed/page.tsx
    saved/page.tsx
    watch/[videoId]/page.tsx
    channels/page.tsx
    settings/page.tsx
    api/
      auth/[...nextauth]/route.ts
      sync/subscriptions/route.ts
      sync/videos/route.ts
      saved/route.ts
  components/
    layout/
    video/
    channel/
    empty-states/
    ui/
  lib/
    auth.ts
    prisma.ts
    youtube.ts
    sync.ts
    date.ts
    env.ts
  prisma/
    schema.prisma
```

## 7. Data Model

Use Prisma models similar to the following.

```prisma
model User {
  id            String   @id @default(cuid())
  email         String?  @unique
  name          String?
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts      Account[]
  sessions      Session[]
  channels      ChannelSubscription[]
  savedVideos   SavedVideo[]
  syncStates    SyncState[]
}

model Channel {
  id              String   @id // YouTube channel ID
  title           String
  description     String?
  thumbnailUrl    String?
  uploadsPlaylist String?
  customUrl       String?
  publishedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  subscriptions   ChannelSubscription[]
  videos          Video[]
}

model ChannelSubscription {
  id              String   @id @default(cuid())
  userId          String
  channelId       String
  youtubeSubId    String?
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel         Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([userId, channelId])
}

model Video {
  id              String   @id // YouTube video ID
  channelId       String
  title           String
  description     String?
  thumbnailUrl    String?
  publishedAt     DateTime
  duration        String?
  viewCount       BigInt?
  likeCount       BigInt?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  channel         Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  savedBy         SavedVideo[]

  @@index([publishedAt])
  @@index([channelId])
}

model SavedVideo {
  id              String   @id @default(cuid())
  userId          String
  videoId         String
  note            String?
  tags            String[] @default([])
  savedAt         DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  video           Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId])
  @@index([savedAt])
}

model SyncState {
  id              String   @id @default(cuid())
  userId          String
  type            String
  lastSyncedAt    DateTime?
  status          String   @default("idle")
  error           String?

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
}
```

Note: Auth.js may generate its own `Account`, `Session`, and `VerificationToken` models depending on adapter setup.

## 8. YouTube Data Fetching Strategy

### 8.1 Login

When the user logs in:

1. Request Google OAuth consent with YouTube readonly scope.
2. Store access token and refresh token through Auth.js account storage.
3. Redirect user to `/feed`.
4. Trigger initial sync if no previous sync exists.

### 8.2 Fetch Subscriptions

Use `subscriptions.list` with:

```txt
part=snippet,contentDetails
mine=true
maxResults=50
```

Paginate using `nextPageToken` until all subscriptions are loaded or until a safety limit is reached.

For each subscription:

- Store channel ID.
- Store channel title.
- Store thumbnail.
- Store subscription relationship for current user.

### 8.3 Fetch Latest Videos

There is no perfect single clean endpoint for "my subscription feed" that exactly mirrors the YouTube homepage subscription feed.

Use this MVP strategy:

1. Get user's subscriptions.
2. For each subscribed channel, retrieve or infer its uploads playlist.
3. Fetch latest items from each uploads playlist using `playlistItems.list`.
4. Normalize all videos into one local feed sorted by `publishedAt DESC`.

To get the uploads playlist, call `channels.list` with:

```txt
part=contentDetails,snippet
id=<channelId>
```

Then read:

```txt
contentDetails.relatedPlaylists.uploads
```

Then call `playlistItems.list` with:

```txt
part=snippet,contentDetails
playlistId=<uploadsPlaylistId>
maxResults=10
```

For v1, fetch only the latest 5-10 videos per channel to keep quota usage reasonable.

### 8.4 Enrich Video Metadata

Optionally call `videos.list` in batches of up to 50 IDs with:

```txt
part=snippet,contentDetails,statistics
id=<comma-separated-video-ids>
```

Use this to get duration, statistics, and richer metadata.

This should be optional because it adds API calls.

### 8.5 API Quota Awareness

The app must cache aggressively.

Recommended v1 behavior:

- Do not auto-sync on every page load.
- Sync subscriptions at most once per day unless the user clicks refresh.
- Sync latest videos at most once every 1-3 hours unless manually refreshed.
- Show local cached data immediately.
- Show a subtle "Last synced" timestamp.
- Add a manual "Refresh" button.

## 9. Saved Videos Behavior

For v1, saved videos should be stored locally in the app database, not in YouTube's Watch Later playlist.

Reasons:

- Keeps OAuth scope read-only.
- Avoids requesting write permissions.
- Avoids modifying the user's actual YouTube account.
- Gives room for custom notes and tags.

### Required saved-video features

- Save video from feed card.
- Unsave video from feed card.
- Save / unsave from watch page.
- View saved videos at `/saved`.
- Sort saved videos by newest saved first.
- Optional note field.
- Optional tags field.

### Future enhancement

Add optional sync to a private YouTube playlist only if the user explicitly enables it. This would require broader OAuth permissions and should not be part of v1.

## 10. Main Screens

### 10.1 Login Page

Route:

```txt
/login
```

Content:

- App name: Watch.local
- Short tagline: "Your YouTube subscriptions without the noise."
- Sign in with Google button
- Small privacy note: "Runs locally. Saved videos are stored on your machine."

### 10.2 Feed Page

Route:

```txt
/feed
```

Purpose:

Show latest videos from subscribed channels only.

Layout:

- Top bar with app name, refresh button, theme toggle, user menu.
- Left sidebar on desktop:
  - Feed
  - Saved
  - Channels
  - Settings
- Main content:
  - Filter chips: All, Today, This week, Saved, Unwatched later if implemented.
  - Video grid or compact list toggle.
  - Clean cards with thumbnail, title, channel, publish date, duration, save button.

Important:

- No recommendation column.
- No comments preview.
- No shorts carousel.
- No trending.
- No unrelated search.

### 10.3 Watch Page

Route:

```txt
/watch/[videoId]
```

Purpose:

Focused viewing page.

Layout:

- Large embedded YouTube iframe.
- Title.
- Channel name.
- Published date.
- Save button.
- Open on YouTube button.
- Optional note editor for saved videos.
- Small list of other recent videos from the same channel only.

Do not show global recommendations.

Embed URL:

```txt
https://www.youtube.com/embed/<videoId>
```

### 10.4 Saved Videos Page

Route:

```txt
/saved
```

Purpose:

Reference library for videos the user wants to revisit.

Features:

- Search saved videos locally by title/channel.
- Filter by tag if tags are implemented.
- Edit note.
- Remove from saved.
- Open watch page.
- Open on YouTube.

### 10.5 Channels Page

Route:

```txt
/channels
```

Purpose:

List subscribed channels that were synced.

Features:

- Channel name.
- Thumbnail.
- Latest known video count in local DB.
- Open channel on YouTube.
- Optional local hide/mute channel toggle in future.

### 10.6 Settings Page

Route:

```txt
/settings
```

Features:

- Show signed-in account.
- Show last subscription sync time.
- Show last video sync time.
- Manual resync subscriptions.
- Manual resync latest videos.
- Toggle theme.
- Log out.
- Optional destructive action: clear local cache.

## 11. UI Direction

Use a calm, minimal learning-focused design.

### Visual style

- Lots of whitespace.
- Neutral background.
- Small typography details.
- No bright red YouTube-style UI except maybe subtle icon accents.
- Dense enough for learning workflows but not overwhelming.

### Components

Use shadcn/ui components:

- Button
- Card
- Badge
- Avatar
- Dropdown Menu
- Dialog
- Sheet
- Tabs
- Input
- Textarea
- Skeleton
- Tooltip
- Toggle

### Feed Card Requirements

Each video card should include:

- Thumbnail.
- Duration overlay if available.
- Title.
- Channel avatar or channel name.
- Published date, human readable.
- Save / unsave button.
- External open button.

Card click should open the local watch page, not YouTube directly.

## 12. Local Domain and Docker

### Recommended local hostname

Prefer:

```txt
watch.localhost
```

Reason:

- `*.localhost` resolves to local machine in modern browsers.
- It avoids some `.local` mDNS conflicts.
- It is easier for local development.

Optional support:

```txt
watch.local
```

If using `watch.local`, document that the user may need to add this to `/etc/hosts`:

```txt
127.0.0.1 watch.local
```

### Docker services

Use Docker Compose with:

```txt
app
postgres
```

Optional later:

```txt
redis
reverse-proxy
```

### docker-compose.yml expectation

- `app` runs Next.js.
- `postgres` stores local data.
- The app should be available on host port `3000`.
- User can access `http://localhost:3000` and optionally `http://watch.localhost:3000`.

For a cleaner `http://watch.local` without a port, add a small reverse proxy later.

## 13. Environment Variables

Create `.env.example`:

```bash
DATABASE_URL="postgresql://watch:watch@postgres:5432/watchlocal?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-me"
GOOGLE_CLIENT_ID="replace-me"
GOOGLE_CLIENT_SECRET="replace-me"
YOUTUBE_API_KEY="optional-for-public-requests"
```

Notes:

- OAuth callback must match the value configured in Google Cloud Console.
- If using `watch.localhost`, test whether OAuth callback should use `localhost` or `watch.localhost` and document the final chosen value.

## 14. Google Cloud Setup Instructions

Copilot should add documentation in `README.md` for this setup:

1. Create or open a Google Cloud project.
2. Enable **YouTube Data API v3**.
3. Configure OAuth consent screen.
4. Create OAuth client credentials for a web application.
5. Add authorized redirect URI:

```txt
http://localhost:3000/api/auth/callback/google
```

6. Copy client ID and client secret into `.env`.
7. Start Docker Compose.
8. Visit the local app and log in.

## 15. API Utility Design

Create `src/lib/youtube.ts` with functions like:

```ts
export async function getYoutubeClientForUser(userId: string) {}

export async function fetchMySubscriptions(userId: string) {}

export async function fetchChannelDetails(channelIds: string[]) {}

export async function fetchLatestUploadsForChannel(channelId: string, uploadsPlaylistId: string) {}

export async function fetchVideoDetails(videoIds: string[]) {}
```

Create `src/lib/sync.ts` with orchestration functions:

```ts
export async function syncSubscriptionsForUser(userId: string) {}

export async function syncLatestVideosForUser(userId: string, options?: { force?: boolean }) {}
```

## 16. Sync Rules

### Subscription sync

- Fetch all subscriptions via pagination.
- Upsert channels.
- Upsert user-channel subscription relationships.
- Mark removed subscriptions as inactive only if an `isActive` field is added later.
- Store sync status.

### Video sync

- Read subscribed channels from local DB.
- Ensure each channel has uploads playlist ID.
- Fetch latest uploads per channel.
- Upsert videos.
- Optionally batch-enrich videos.
- Store sync status.

### Error handling

The UI should gracefully show:

- OAuth expired / reconnect needed.
- Quota exceeded.
- No subscriptions found.
- Sync failed with retry option.
- Network unavailable.

Never crash the feed page because one channel failed to sync.

## 17. Routes and API Endpoints

### Pages

```txt
GET /                 -> redirect to /feed if logged in, otherwise /login
GET /login            -> login page
GET /feed             -> subscription video feed
GET /watch/[videoId]  -> focused video page
GET /saved            -> saved videos
GET /channels         -> synced subscriptions
GET /settings         -> settings and sync controls
```

### API routes

```txt
POST /api/sync/subscriptions
POST /api/sync/videos
GET  /api/videos
GET  /api/videos/[videoId]
GET  /api/saved
POST /api/saved
DELETE /api/saved/[videoId]
PATCH /api/saved/[videoId]
```

## 18. Acceptance Criteria

### Authentication

- User can sign in with Google.
- App requests only read-only YouTube scope in v1.
- User can sign out.
- Tokens are not exposed to client-side code.

### Feed

- Feed shows only videos from subscribed channels.
- Feed does not show YouTube recommendations, trending, comments, or unrelated content.
- Feed loads from local cache after initial sync.
- User can manually refresh.
- User sees last synced timestamp.

### Saving

- User can save a video.
- Saved state is visible on feed and watch page.
- User can remove a saved video.
- Saved videos persist after Docker restart as long as DB volume remains.

### Watching

- User can open a local watch page.
- Watch page embeds the YouTube video.
- User can open the video on YouTube in a new tab.

### UI

- App uses Tailwind and shadcn/ui.
- App supports light and dark mode.
- Layout works on desktop and mobile widths.
- No visual clutter from YouTube homepage-style recommendations.

### Docker

- `docker compose up` starts the app and database.
- README explains setup clearly.
- `.env.example` is complete.

## 19. Suggested Implementation Phases for Copilot

### Phase 1 — Project Bootstrap

Goal: Create the app foundation.

Tasks:

- Initialize Next.js app with TypeScript and App Router.
- Install Tailwind CSS.
- Install and configure shadcn/ui.
- Add base layout.
- Add theme support.
- Add placeholder pages: login, feed, saved, channels, settings, watch.
- Add Dockerfile and docker-compose.yml.
- Add `.env.example`.

Acceptance:

- App runs in Docker.
- UI shell is visible.
- Navigation works between placeholder pages.

### Phase 2 — Database and Auth

Goal: Add persistence and Google login.

Tasks:

- Add Prisma.
- Add PostgreSQL service.
- Create initial Prisma schema.
- Add Auth.js / NextAuth Google provider.
- Add Prisma adapter if appropriate.
- Configure YouTube readonly OAuth scope.
- Protect authenticated pages.
- Add sign-in and sign-out flows.

Acceptance:

- User can log in with Google.
- User session persists.
- Auth pages work in Docker.
- Database migrations run successfully.

### Phase 3 — Subscription Sync

Goal: Fetch and store subscribed channels.

Tasks:

- Implement YouTube API client helper.
- Implement token retrieval for authenticated user.
- Implement `syncSubscriptionsForUser`.
- Add `/api/sync/subscriptions` endpoint.
- Add settings button to manually sync subscriptions.
- Add channels page listing synced channels.

Acceptance:

- User can sync subscriptions.
- Channels are stored locally.
- Channels page shows real subscribed channels.
- Errors are displayed cleanly.

### Phase 4 — Video Sync and Feed

Goal: Build the main subscription feed.

Tasks:

- Fetch upload playlist IDs for channels.
- Fetch latest uploads per channel.
- Store videos locally.
- Add optional metadata enrichment via `videos.list`.
- Implement `/api/sync/videos`.
- Build feed query from local database.
- Build video cards.
- Add manual refresh.
- Add last synced timestamp.

Acceptance:

- Feed shows recent videos from subscribed channels only.
- Feed is sorted by publish date descending.
- Feed loads from DB without calling YouTube on every page load.
- Manual refresh updates the feed.

### Phase 5 — Watch Page

Goal: Add focused video viewing.

Tasks:

- Create `/watch/[videoId]` page.
- Embed YouTube iframe.
- Show title, channel, published date.
- Add open-on-YouTube link.
- Add same-channel recent videos section.

Acceptance:

- Clicking a feed card opens local watch page.
- Video plays through YouTube embed.
- No global recommendations are shown inside the app UI.

### Phase 6 — Saved Videos

Goal: Add local reference library.

Tasks:

- Implement save / unsave API endpoints.
- Add save button to video cards.
- Add save button to watch page.
- Build saved videos page.
- Add optional notes and tags.

Acceptance:

- User can save and unsave videos.
- Saved videos persist locally.
- Saved page shows all saved videos.
- Saved state is reflected across feed, watch page, and saved page.

### Phase 7 — Polish and Hardening

Goal: Make the app pleasant and reliable.

Tasks:

- Add loading skeletons.
- Add empty states.
- Add error boundaries.
- Add quota-aware messages.
- Add responsive mobile layout.
- Add README setup docs.
- Add basic tests for sync logic.
- Add linting and formatting.

Acceptance:

- App is usable daily.
- Setup instructions are clear.
- Common errors are handled gracefully.
- UI feels intentionally minimal.

## 20. Future Enhancements

Consider after v1:

- Hide / mute specific subscribed channels locally.
- Add local categories for channels.
- Add tags and notes to saved videos.
- Add transcript extraction if available through supported APIs or user-provided transcript sources.
- Add local full-text search over saved videos and notes.
- Add "learning queue" separate from saved videos.
- Add keyboard shortcuts.
- Add RSS fallback for public channel uploads.
- Add optional private YouTube playlist sync.
- Add watch progress tracking locally.
- Add daily digest view.
- Add import/export of saved videos as JSON or Markdown.

## 21. Copilot Build Prompt

Use this prompt when starting implementation:

```txt
You are building Watch.local, a local-first minimal YouTube learning app.

Read implementation-brief.md fully before coding.

Build the app phase by phase. Do not implement future enhancements until the MVP is complete.

Prioritize:
- clean architecture
- readable TypeScript
- server-side token safety
- local caching
- minimal UI
- Dockerized setup
- clear README instructions

Do not build YouTube recommendations, comments, trending, Shorts feed, or unrelated search in v1.

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Auth.js / NextAuth Google provider
- YouTube Data API v3
- Prisma
- PostgreSQL
- Docker Compose

Start with Phase 1 from the brief. After each phase, update the README and leave a short implementation note describing what was completed and how to run/test it.
```

## 22. Implementation Notes

### Phase 1 - Project Bootstrap

Completed:

- Initialized a Next.js App Router project with TypeScript.
- Added Tailwind CSS configuration and shadcn/ui-compatible component setup.
- Added base layout, theme provider, light/dark mode toggle, and a minimal responsive app shell.
- Added placeholder routes for `/login`, `/feed`, `/saved`, `/channels`, `/settings`, and `/watch/[videoId]`.
- Added Dockerfile, `docker-compose.yml`, `.env.example`, and a local PostgreSQL service definition.

Run locally:

```bash
npm install
npm run dev
```

Then visit:

```txt
http://localhost:3000
```

Run with Docker:

```bash
docker compose up --build
```

Then visit:

```txt
http://localhost:3000
http://watch.localhost:3000
```

Notes:

- Google OAuth, Prisma, and real YouTube sync begin in later phases.
- The Phase 1 feed uses placeholder cards only so the navigation and UI shell can be verified.
- Dependency installation could not be completed in this environment because `npm install` failed with repeated `ECONNRESET` network errors.

### Phase 2 - Database and Auth

Completed:

- Added Prisma and Auth.js / NextAuth dependencies to `package.json`.
- Added a PostgreSQL Prisma schema with Auth.js adapter models plus Watch.local `Channel`, `ChannelSubscription`, `Video`, `SavedVideo`, and `SyncState` models.
- Added the initial Prisma migration for the Phase 2 schema.
- Added a shared Prisma client helper.
- Added Google OAuth through Auth.js with the read-only YouTube scope:

```txt
https://www.googleapis.com/auth/youtube.readonly
```

- Added `/api/auth/[...nextauth]`.
- Updated `/login` to start Google sign-in.
- Protected authenticated app routes and redirected unauthenticated users to `/login`.
- Updated the app shell and settings page with signed-in account display and sign-out actions.
- Updated Docker startup to apply Prisma migrations before running the Next.js dev server.

Required `.env` values:

```bash
DATABASE_URL="postgresql://watch:watch@postgres:5432/watchlocal?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-me"
GOOGLE_CLIENT_ID="replace-me"
GOOGLE_CLIENT_SECRET="replace-me"
YOUTUBE_API_KEY="optional-for-public-requests"
```

Google Cloud redirect URI:

```txt
http://localhost:3000/api/auth/callback/google
```

Run locally:

```bash
npm install
npm run db:migrate
npm run dev
```

Run with Docker:

```bash
docker compose up --build
```

Notes:

- `docker compose up --build` runs `npx prisma migrate deploy` before starting the app.
- You must replace the Google OAuth placeholders before sign-in can complete.
- Dependency installation and runtime auth testing were not completed in this environment because the npm install request was declined after earlier network resets.

### Phase 3 - Subscription Sync

Completed:

- Added a YouTube Data API helper in `src/lib/youtube.ts`.
- Added server-side Google access-token retrieval from the Auth.js `Account` table.
- Added Google access-token refresh using the stored refresh token when the access token is expired.
- Added `fetchMySubscriptions(userId)` using `subscriptions.list` with:

```txt
part=snippet,contentDetails
mine=true
maxResults=50
```

- Added paginated subscription fetching with a safety limit.
- Added `syncSubscriptionsForUser(userId)` in `src/lib/sync.ts`.
- Upserts synced YouTube channels into `Channel`.
- Upserts the local user-to-channel subscription relationship into `ChannelSubscription`.
- Tracks subscription sync status, errors, and last sync time in `SyncState`.
- Added `POST /api/sync/subscriptions`.
- Added a server action for manual subscription sync.
- Updated `/settings` with a working "Sync subscriptions" action and last-sync display.
- Updated `/channels` to list locally synced subscribed channels with thumbnails, local video counts, and YouTube channel links.

Run:

```bash
npm install
npm run db:migrate
npm run dev
```

Then:

1. Visit `http://localhost:3000`.
2. Sign in with Google.
3. Open `/settings` or `/channels`.
4. Click "Sync subscriptions".

API test after sign-in:

```bash
curl -X POST http://localhost:3000/api/sync/subscriptions
```

Notes:

- This phase syncs channels only. Video upload playlist lookup and feed video syncing begin in Phase 4.
- The sync is manual and cache-first by design; it does not call YouTube on every page load.
- No new database migration was needed because the Phase 2 schema already included channel subscription tables.
- Dependency installation and runtime YouTube API testing were not completed in this environment because the npm install request was declined.

### Phase 4 - Video Sync and Feed

Completed:

- Added channel detail fetching through `channels.list` to discover each subscribed channel's uploads playlist.
- Added latest upload fetching through `playlistItems.list`.
- Added optional metadata enrichment through `videos.list` for duration, statistics, and richer thumbnails.
- Added `syncLatestVideosForUser(userId)` in `src/lib/sync.ts`.
- Video sync reads locally synced subscribed channels, fills missing upload playlist IDs, fetches the latest uploads, and upserts videos into the local database.
- Video sync records last-sync time, partial channel failures, and sync errors in `SyncState`.
- Added `POST /api/sync/videos`.
- Added `GET /api/videos` for the authenticated local feed.
- Updated `/feed` to load videos from PostgreSQL instead of placeholder cards.
- Added a working feed refresh action.
- Updated video cards to show real thumbnails, channel titles, publish dates, and YouTube durations.
- Updated `/settings` with video sync status and a manual "Sync videos" action.

YouTube calls used:

```txt
channels.list part=contentDetails,snippet id=<channelIds>
playlistItems.list part=snippet,contentDetails playlistId=<uploadsPlaylistId> maxResults=10
videos.list part=snippet,contentDetails,statistics id=<videoIds>
```

Run:

```bash
npm install
npm run db:migrate
npm run dev
```

Then:

1. Sign in with Google.
2. Sync subscriptions from `/settings` or `/channels`.
3. Open `/feed`.
4. Click "Refresh" to sync recent uploads.

API test after sign-in:

```bash
curl -X POST http://localhost:3000/api/sync/videos
curl http://localhost:3000/api/videos
```

Notes:

- The feed is local-cache-first and does not call YouTube on every page load.
- Each video sync fetches up to 10 latest videos per subscribed channel to keep quota usage reasonable.
- If one channel fails, the sync records a partial error and continues with the other channels.
- No new database migration was needed because the Phase 2 schema already included `Video` and upload playlist fields.
- Dependency installation, typecheck, lint, tests, production build, and Docker build now pass as of Phase 7.

### Phase 5 - Watch Page

Completed:

- Updated `/watch/[videoId]` to load the requested video from the local PostgreSQL cache.
- The watch page only shows videos that belong to channels synced for the authenticated user.
- Added the focused YouTube iframe embed:

```txt
https://www.youtube.com/embed/<videoId>
```

- Added title, channel, published date, duration, description, save-state display, and open-on-YouTube action.
- Added a same-channel recent videos section.
- Kept global recommendations out of the app UI; related videos are limited to the same synced channel.
- Added `GET /api/videos/[videoId]` for authenticated local video details.

Run:

```bash
npm install
npm run db:migrate
npm run dev
```

Then:

1. Sign in with Google.
2. Sync subscriptions.
3. Sync videos.
4. Open a video from `/feed`.

API test after sign-in:

```bash
curl http://localhost:3000/api/videos/<videoId>
```

Notes:

- Save/unsave actions are implemented in Phase 6 below.
- No new database migration was needed.
- Typecheck, lint, tests, production build, and Docker build now pass as of Phase 7.

### Phase 6 - Saved Videos

Completed:

- Added local-only save/unsave behavior backed by the existing `SavedVideo` table.
- Added server actions for save toggle, remove saved video, and update saved video notes/tags.
- Added shared saved-video access checks so only videos from the authenticated user's local subscription feed can be saved.
- Enabled save/unsave buttons on feed video cards.
- Enabled save/unsave on `/watch/[videoId]`.
- Added a local note and tag editor on the watch page when a video is saved.
- Rebuilt `/saved` as a real local reference library.
- `/saved` lists saved videos newest-first, supports title/channel search, local notes, comma-separated tags, remove action, local watch links, and YouTube links.
- Added `GET /api/saved`.
- Added `POST /api/saved`.
- Added `DELETE /api/saved/[videoId]`.
- Added `PATCH /api/saved/[videoId]`.

Run:

```bash
npm install
npm run db:migrate
npm run dev
```

Then:

1. Sign in with Google.
2. Sync subscriptions.
3. Sync videos.
4. Save a video from `/feed` or `/watch/[videoId]`.
5. Open `/saved` to edit notes/tags or remove the saved video.

API tests after sign-in:

```bash
curl http://localhost:3000/api/saved
curl -X POST http://localhost:3000/api/saved
curl -X PATCH http://localhost:3000/api/saved/<videoId>
curl -X DELETE http://localhost:3000/api/saved/<videoId>
```

Notes:

- Saved videos are stored only in the local Watch.local database.
- The app does not write to YouTube Watch Later or request YouTube write permissions.
- No new database migration was needed because the Phase 2 schema already included `SavedVideo`.
- Typecheck, lint, tests, production build, and Docker build now pass as of Phase 7.

### Phase 7 - Polish and Hardening

Completed:

- Added authenticated app loading skeletons.
- Added an authenticated app error boundary with a retry action.
- Added a friendly not-found page for missing routes or unsynced videos.
- Added a sync policy helper for quota-aware non-forced video sync decisions.
- Manual feed refresh still forces a video sync, matching the MVP requirement.
- Added basic sync policy tests with Node's built-in test runner.
- Added `npm run test`.
- Added `.eslintignore` for generated Next files.
- Added `.dockerignore`, reducing Docker build context from hundreds of MB to a few KB.
- Added `package-lock.json` now that dependencies install successfully.
- Refreshed `package-lock.json` metadata.

Verification:

```bash
npm run db:generate
npm run test
npm run typecheck
npm run lint
npm run build
docker compose build
```

All commands passed.

Notes:

- The Docker build reported 3 moderate npm audit findings from installed dependencies. They were not auto-fixed because `npm audit fix --force` can introduce breaking upgrades.
- Runtime Google OAuth and live YouTube API behavior still require real Google credentials in `.env`.
