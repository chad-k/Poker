# Poker with friends — GitHub + Render

Play-money Texas Hold’em for up to six friends, with bots for empty seats. This is a standalone Node.js app. It does not need ChatGPT, Cloudflare, a database, or API keys.

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

The game supports folds, checks, calls, raises, all-ins, side pots, ties, and dealer rotation. The host can remove players or reset stacks between hands. Bots make simple check/call/fold decisions. A disconnected player must reconnect before their turn can continue. Refreshing in the same browser restores the player's identity.

## Hosting behavior

Games live in server memory and disappear on a restart or redeployment. Use one server instance; multiple instances do not share tables. Inactive tables expire after 24 hours. Render free services can sleep after inactivity, so the first visit may take time to wake the service. Open it before inviting friends.

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

- `server.js`: Express server, player identity, tables, and validated actions
- `game.js`: rules, hand rankings, private views, and bots
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
