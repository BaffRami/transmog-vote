# ⚔ Fnatics Transmog Competition — Voting App

WoW-themed transmog voting site for **Fnatics** guild on **Firestorm** private server.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local — set your JWT_SECRET and ADMIN_PASSWORD

# 3. Start the dev server
npm run dev
# Open http://localhost:3000
```

## How It Works

### For Players
1. Go to `/` and click **Sign Up** — enter your character name + a password
2. You get a **6-character code** displayed on screen — share it in Discord with the GM
3. Once the GM approves you (see Admin section), log in and go to `/vote`
4. The vote page auto-refreshes. When voting opens for someone, pick a score 1–10 and submit!

### For You (the Admin)
1. Go to `/admin` and enter the password from your `.env.local`
2. **Players tab** — see all registered characters with their codes; click **Approve** to grant voting rights
3. **Session tab** — pick a contestant from the dropdown → click **Open Voting** when it's their turn
4. When everyone has voted → **Close Voting** → pick the next contestant
5. **Results tab** — live rankings by average score

## Pages
| Page | What it does |
|------|-------------|
| `/` | Login / Sign Up |
| `/vote` | Live voting page (auto-refreshes every 4s) |
| `/leaderboard` | Public standings (auto-refreshes every 5s) |
| `/admin` | Admin dashboard |

## Notes
- The SQLite database (`transmog.db`) is created automatically in the project root
- Max 30 players is well within SQLite's capabilities — no config needed
- Votes are stored permanently; you can run multiple competitions by deleting `transmog.db`
- To deploy publicly, run `npm run build && npm start` and serve on any Node.js host
