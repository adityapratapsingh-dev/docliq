# Cliq — Find Your Cliq

> **Find your Cliq. Share your vibe.**

Cliq is a social app where teens share videos, photos and thoughts, upgrade the
best takes, Cliq Up new friends, and chat in real time. **Step 2** replaced all
demo content with real user accounts, real messaging, and a real database.

## Stack

- **Next.js 15** (App Router) + **TypeScript** — zero-error `npm run build`
- **Tailwind CSS v4** with CSS-variable accent theming
- **lucide-react** icons
- **Cloudflare D1** (HTTP REST API) with a zero-crash in-memory fallback

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

Open the app and you land on the **Welcome & Auth** screen. Sign Up with a
display name, `@username`, password, age, bio, interests and an optional avatar —
or Log In. Sessions use a signed, httpOnly cookie.

### Connecting the database (optional)

The app boots and works with **zero configuration** by falling back to an
in-memory store. For persistent data, set these in Vercel → Settings →
Environment Variables (or a local `.env.local`):

| Variable | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| `CLOUDFLARE_DATABASE_ID` | D1 database id |
| `CLOUDFLARE_API_TOKEN` | API token with D1 edit permission |
| `CLIQ_SESSION_SECRET` | Signs session cookies (`openssl rand -base64 48`) |

`ensureTablesExist()` runs `CREATE TABLE IF NOT EXISTS` for every table on the
first request, so no manual migration step is needed. See `schema.sql` for the
canonical schema. When D1 is not configured, Settings shows an amber
"fallback mode" notice instead of failing.

## What Step 2 changed

**Part 1 — real content & auth**
- Deleted every demo video, photo, chat post, fake profile, notification and
  pre-filled DM. Removed the simulated 1.5s bot auto-reply.
- Added the Welcome & Auth screen (Sign Up / Log In / Log Out in Settings).
- Added glassmorphic empty states with CTAs on all five tabs.

**Part 2 — Chats & Friends overhaul**
- Mobile shows the conversation list first and slides into a full-screen chat
  with a back (`←`) button; desktop keeps the split view.
- Reply-to-message with a quoted banner, emoji reactions, copy text, and unsend
  for your own messages. Images can be attached or pasted as URLs.
- `Sent ✓` / `Seen ✓✓` delivery indicators with real timestamps.
- `/api/messages` is polled every 3s so two real users see new messages live.

**Part 3 — Cloudflare D1 + API routes**
- `src/lib/d1.ts` (HTTP REST helper + `ensureTablesExist`), `schema.sql`,
  `src/lib/schema.ts`.
- Routes: `/api/auth`, `/api/users`, `/api/posts`, `/api/posts/react`,
  `/api/comments`, `/api/friends`, `/api/messages`.
- All five tabs read and write through these routes.

## Project structure

```
schema.sql                     canonical D1 schema
src/app/api/                   auth · users · posts · posts/react · comments · friends · messages
src/app/                       layout.tsx (metadata) · page.tsx · globals.css
src/components/
  CliqApp.tsx                  auth gate + tab router
  CliqProvider.tsx             session/state context
  AuthScreen.tsx               welcome & auth
  Shell.tsx                    header · sidebar · bottom nav
  NotificationDrawer.tsx       friend requests + unread messages
  CreateModal.tsx              create post · share sheet
  tabs/                        Videos · Photos · ChatPosts · Friends · Profile (+ useFeed, PostCardMini)
  ui/                          Primitives · FeedBits
src/lib/
  d1.ts · schema.ts            database access
  store/                       Store interface + memory + D1 implementations
  auth.ts · session.ts         PBKDF2 hashing · signed session tokens
  api-client.ts · api.ts       client + server helpers
  constants.ts · theme.ts · utils.ts
src/types/cliq.ts              domain types
```

## Security notes

- Passwords are hashed with PBKDF2-SHA256 (120k iterations) before storage.
- Session cookies are httpOnly, SameSite=Lax, and Secure in production.
- Every mutating route re-checks ownership (posts, comments, messages).
- Emoji reactions on messages are stored as JSON on the message row.

## Deploying to Vercel

Push the branch and import the project. Set the environment variables above —
without them the site still deploys and runs on the fallback store.
