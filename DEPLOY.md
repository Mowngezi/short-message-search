# Source SMS — Deploy Runbook

> Ship the webhook to a public URL so Twilio can reach it. Target: Railway. Time: 15 minutes end-to-end.

---

## Why Railway

Three constraints: the server needs to be long-running (not serverless — Opus 4.7 adaptive thinking can take 15–25s, past Vercel's 10s free tier timeout), cold starts need to be short (judges will text live), and the deploy path needs to be git-push-and-forget. Railway wins on all three. Fly.io is close but has heavier setup; Render free tier has brutal cold starts (~30s).

Cost for hackathon weekend: ~$2–3 of Railway's $5 monthly credit. Trivial.

---

## Prerequisites

- [x] GitHub repo pushed: `https://github.com/Mowngezi/short-message-search`
- [x] `npm start` script in place (added in commit `5ef50a1`)
- [x] `.env.example` documents all required env vars
- [ ] Railway account (sign in with GitHub: `https://railway.app/`)
- [ ] Twilio account with a provisioned SMS-capable phone number

---

## Step 1 — Railway project

1. `https://railway.app/new` → **Deploy from GitHub repo** → pick `Mowngezi/short-message-search`.
2. Railway auto-detects Node, runs `npm install`, then `npm start`. First build takes ~60s.
3. Wait for green "Deployed" status. First boot will crash because env vars aren't set yet — expected.

## Step 2 — Env vars

In the Railway project: **Variables** tab → **Raw Editor** → paste:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

Do **not** set `PORT` — Railway sets it automatically. `server.js` already reads `process.env.PORT`.

Railway redeploys automatically after variables save. Wait for green.

## Step 3 — Public URL

In the project → **Settings** → **Networking** → **Generate Domain**. You'll get something like `source-sms-production.up.railway.app`.

**Smoke test** (do this before Twilio):

```bash
curl https://<your-domain>.up.railway.app/
```

Expected: JSON with `status`, `inventory_count`, `uptime`. If you get HTML or an error, check the Railway **Deploy Logs** tab.

## Step 4 — Twilio webhook

Twilio Console → **Phone Numbers** → your number → **Messaging Configuration**:

- **A message comes in** → `Webhook`
- URL: `https://<your-domain>.up.railway.app/sms`
- Method: `HTTP POST`
- Save.

## Step 5 — Live SMS test

Text your Twilio number from a real phone:

```
help
```

Expected: the 133-char help response comes back in under 5 seconds. If nothing arrives, check:

1. Railway logs — look for the incoming POST to `/sms`
2. Twilio debugger — `https://console.twilio.com/us1/monitor/logs/debugger`
3. Your phone is allowed (Twilio trial numbers have a verified-callers list)

## Step 6 — Warm the instance (day of judging)

Railway free-tier instances cool down after ~5 minutes of inactivity. The first SMS after cooldown can wait 10+ seconds while the container boots. Before judges text, hit:

```bash
curl https://<your-domain>.up.railway.app/
```

Every 2 minutes for the 10 minutes leading up to the demo. Keeps the instance warm. Use a cron tab / `watch` / a pinned browser tab on the health endpoint.

---

## Rollback / panic buttons

- **Deploy broke?** Railway → **Deployments** → previous green deploy → **Redeploy**.
- **Env var typo?** Variables tab → edit → Railway redeploys in ~30s.
- **Twilio webhook timing out?** Your Railway URL is probably cold-started. Health-endpoint warm-up fixes it.
- **Opus quota hit mid-demo?** Check Anthropic Console. Only real answer is a backup key — keep one ready on a second workspace.

---

## Post-deploy checklist (before judging)

- [ ] `curl /` returns 200 with expected JSON
- [ ] `help` over real SMS returns correct canned response
- [ ] `home Alex 3rdAve` persists to `user_profiles` (check Supabase Table Editor)
- [ ] `selling chicken R35` appends to `inventory.json` in memory + triggers purge
- [ ] `malini ugwayi?` returns isiZulu response under 160 chars
- [ ] Warm-up cron running for last 10 minutes before live demo
