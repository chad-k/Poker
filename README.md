# Poker with friends — GitHub + Render
# Check out my app at - https://poker-u6ej.onrender.com

Play-money Texas Hold’em for up to six friends, with selectable avatars, a session scoreboard, table chat, a turn timer, and three bot difficulty levels. This is a standalone Node.js app. It does not need ChatGPT, Cloudflare, a database, or API keys.

## Upload to GitHub

1. Extract the downloaded ZIP.
2. Create a new GitHub repository, for example `Poker-Game`.
3. Upload the contents of the extracted `Poker-Game` folder to the repository root. `package.json`, `server.js`, and `render.yaml` must appear directly at the root, with `src` and `test` beside them.
4. Upload the folders too. Do not upload the ZIP itself or a `node_modules` folder.

## Deploy on Render

1. Choose New → Web Service and connect the GitHub repository.
2. Use these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root Directory | Leave blank when files are at the repository root |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |
| Instance Type | Free, or a paid instance if preferred |

3. Deploy the service, then open the URL Render provides.

Alternative: choose New → Blueprint and select the repository. The included `render.yaml` supplies the settings.

## Play

Enter your name and open a table. Add bots or copy the table invite link to friends. The host deals the cards. Each player starts with 1,000 chips; blinds are 10 / 20. Opponents’ cards stay on the server until showdown. Tables update every 1.5 seconds.

The game supports folds, checks, calls, raises, all-ins, side pots, ties, and dealer rotation. The host can remove players or reset stacks between hands. Standard and Challenging bots estimate winning chances using simulated unknown cards, compare pot odds, size bets, raise strong hands, and occasionally bluff. They use only their own cards and visible table information. Challenging adds more simulations and a simple range adjustment after visible raises. Easy retains the original check/call/fold strategy. Each bot has a tight, balanced, or loose playing style. These are practice opponents, not trained models or professional poker solvers. With the timer enabled, disconnected players automatically check when no chips are owed, or fold otherwise. With the timer off, the table waits for their action. Refreshing in the same browser restores the player's identity.

## Table chat and turn timer

The host chooses a 15-, 30-, or 60-second turn timer (or Off) between hands. The default is 30 seconds. Everyone sees a countdown for the active player. The server enforces the deadline even if the active player closes their browser: it checks when no call is owed and folds otherwise. Timeout events appear in table activity. Each new human turn gets a fresh deadline. Chat, polling, avatar changes, and reconnecting do not extend it. Late actions are rejected after the timeout has been processed.

Chat is shared among seated players in the same table. Messages show the sender's name and avatar. Press Enter or Send to post; Shift+Enter adds a newline. The last 100 messages are kept, with a 300-character limit and a 20-message-per-minute limit per player. Chat is sent as text and does not affect the betting turn or timer. Chat and scores are cleared when the server restarts.

## Avatars and scores

Choose an avatar on the entry screen. Click your own avatar at the table to change it. The selection is shown to everyone.

The scoreboard lists current players by cumulative net chips won over completed hands, then by their current stack. It shows current chips, net won, hands played, hands won, ties, and the last completed hand's net result. A player winning multiple side pots gets one hand win. Split-pot winners get a win and a tie. Uncalled chips returned to a player do not count as a pot win. A side-pot winner can still have a negative net result for the overall hand.

Refill stacks to 1,000 preserves session scores; Reset session scores clears statistics while keeping chip stacks. Both actions are host-only and available between hands. Removed players no longer appear on the scoreboard. These are current-table session scores, not a permanent account leaderboard.

## Updating an existing GitHub / Render deployment

Replace the old source files with all files from this package, including the new `bots.js`, `poker-rank.js`, and `avatars.js` at the repository root. Keep the `src` and `test` folders intact. Commit the changes and deploy the latest commit in Render.

Keep Build Command set to `npm ci && npm run build` and Start Command set to `npm start`. Do not use only `npm install` as the build command: the frontend must be built into `dist` before the server can display it. The redeployment starts fresh tables and scores.

## Hosting behavior

Games, chat messages, and session scores live in server memory and disappear on a restart or redeployment. Use one server instance; multiple instances do not share tables. Inactive tables expire after 24 hours. Render free services can sleep after inactivity, so the first visit may take time to wake the service. Open it before inviting friends.

Unlike the private ChatGPT-hosted version, this version has no sign-in wall. Anyone with the Render URL can open a table, and anyone with a table invite can join it.

## Run locally

Install Node.js 22 or newer, then open a terminal in this folder:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000`.

For frontend development, leave the server running in one terminal and run `npm run dev` in another. Vite proxies API requests to the server on port 3000.

Run tests with `npm test`.

## Files

- `server.js`: Express server, player identity, tables, chat, turn deadlines, and validated actions
- `game.js`: rules, session statistics, avatars, and private player views
- `poker-rank.js`: best-five hand evaluator
- `bots.js`: equity simulations and bot decisions
- `avatars.js`: shared avatar choices
- `src/App.jsx`: interface
- `src/styles.css`: responsive table design
- `src/main.jsx`: React entry
- `index.html`: page shell
- `vite.config.js`: frontend build configuration
- `package.json` and `package-lock.json`: reproducible dependencies
- `render.yaml`: Render deployment settings
- `test/`: rules and multiplayer API tests

Play-money chips only. No cash wagers, purchases, or prizes.

Official deployment reference: https://render.com/docs/deploy-node-express-app
