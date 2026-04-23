# Source SMS — Build Log

> Every change, every decision, every fix — tracked.

---

## Day 3 — Thursday, April 23

### 16:45 — Assessment & Audit Complete

**Status at start of session:**
- `agent.js` — ✅ Working (standalone compression engine)
- `sandbox.js` — ✅ Working (interactive REPL for prompt testing)
- `server.js` — ❌ Broken (duplicate SYSTEM_PROMPT declaration, lines 14-29)
- `gateway.js` — ❌ Broken (ES module imports, but package.json is CommonJS)
- `inventory.json` — ❌ Empty (supply route has no data)
- `package.json` — ❌ Missing `@anthropic-ai/sdk` dependency

**Key discovery:** isiZulu query test revealed Claude Opus 4.7 can code-switch between isiZulu and English within 160-char SMS responses. This is a major differentiator.

**The 140 Trick:** Setting internal prompt limit to 140 chars prevents SMS overflow past 160. Tested and validated — engineering refinement that judges will respect.

---

### Build Queue (Priority Order)

- [x] **P0: Fix `server.js`** — remove duplicate SYSTEM_PROMPT, clean up the prompt
- [x] **P0: Fix `package.json`** — add `@anthropic-ai/sdk` dependency
- [x] **P0: Fix `gateway.js`** — convert from ESM to CommonJS to match project
- [x] **P0: Seed `inventory.json`** — realistic Alexandra township inventory data
- [x] **P0+: Unify server + gateway** — merged supply/demand routing into server.js webhook
- [x] **P1: Add extended thinking** — Opus 4.7 internal reasoning before compression
- [x] **P1: Build Home Node system** — first-time user geo-tag onboarding via Supabase
- [ ] **P2: Record 3-min demo video** — Gogo → Themba → Thando storyboard
- [ ] **P2: GitHub repo cleanup** — README, architecture, setup instructions
- [ ] **P2: Write 100-200 word summary** — anchored in "Information Tax" framing

---

### 16:50 — P0 Fixes Complete ✅

**`server.js` — Full rewrite**
- Removed duplicate SYSTEM_PROMPT declaration (the crash bug)
- Merged supply/demand routing from gateway.js into the webhook
- Added inventory context injection — Claude now sees local supply data when answering demand queries
- Applied the 140-char internal limit trick across all prompts
- Added multilingual instruction (isiZulu, isiXhosa, Setswana, Sesotho, Afrikaans)
- Added `detectSupplyIntent()` — routes "got", "update", "selling", "stock" to supply handler

**`gateway.js` — Converted to CommonJS**
- Switched from `import` to `require()` to match `package.json` type
- Added safe JSON parsing for empty inventory
- Added multilingual instruction to demand route prompt
- Still works as standalone CLI simulator: `node gateway.js [phone] [message]`

**`package.json` — Fixed dependency**
- Installed `@anthropic-ai/sdk` (was imported everywhere but never declared)

**`inventory.json` — Seeded with realistic data**
- 5 vendor entries: cement, chicken, maize meal, airtime, paraffin
- All tagged to Alexandra zones (3rdAve, FarRd, LondonRd, 2ndAve, 8thAve)
- These are actual items people in Alex search for daily

**`sandbox.js` — Updated prompt**
- Applied 140-char internal limit (prevents the isiZulu overflow we caught)
- Added multilingual instruction

---

### 17:00 — P1 Features Complete ✅ (Extended Thinking + Home Node)

**`server.js` — Extended Thinking Integration**
- Added `thinking: { type: "enabled", budget_tokens: 10000 }` to Claude API calls
- Claude now reasons internally about the query, relevant context, and compression strategy BEFORE generating the 140-char response
- Terminal logs show a preview of Claude's thinking (demo gold — judges can see the reasoning)
- Response extraction updated to handle `[thinking, text]` content block array
- This is THE Opus 4.7 differentiator — no other model has this

**`server.js` — Home Node System (Semantic GPS)**
- Three new functions: `getUserProfile()`, `saveUserHome()`, `isHomeCommand()`
- User texts `home Alex 3rd Ave` → saved to Supabase `user_profiles` table
- Future queries automatically inject their `geo_tag` into the system prompt
- Claude uses the location context to prioritize local results
- Supply route now also uses vendor's Home Node as their geo_tag
- Gives a $10 Nokia the location awareness of a $1000 iPhone — through language alone

**Server now has 3 routing modes:**
1. `home [area]` → Home Node registration (Semantic GPS)
2. `got [item]` / `selling [item]` → Supply update (Thando route)
3. Any other query → Demand search with extended thinking (Themba/Gogo route)

**`sandbox.js` — Extended Thinking Tester**
- Now shows Claude's full internal reasoning in a formatted box
- Then shows the compressed SMS response
- This is the demo showpiece — judges can literally read Claude thinking:
  "The user is asking in isiZulu about cigarettes... I need to compress pricing..."

**`setup.sql` — Supabase Table Schema (NEW)**
- SQL script for both tables: `sms_exchanges` + `user_profiles`
- Run in Supabase Dashboard → SQL Editor
- `user_profiles` stores `phone_number` → `geo_tag` mapping (the Home Node)

---

### 17:10 — Extended Thinking API Fix + Live Tests ✅

**API Discovery:** Opus 4.7 uses `thinking.type: "adaptive"` (NOT `"enabled"`).
No `budget_tokens` — the model decides how much to think adaptively.
Effort controlled via `output_config: { effort: "high" }`.

**Test Results:**

| Query | Language | Length | Result |
|-------|----------|--------|--------|
| "malini ugwayi wokubhema elokishini lase alex?" | isiZulu | **127/160** ✅ | Full pricing in isiZulu, code-switched brand names, spaza vs shop comparison |
| "cheapest cement near 3rd Ave in Alex, quality vs London Road?" | English (complex) | **152/160** ✅ | Compared 2 locations, 2 prices, 2 cement grades (32.5N vs 42.5N), quality assessment |

**Key insight:** The 140-char internal limit trick is working — both responses fit SMS with room to spare.

---

### 17:40 — Production Hardening + Live Demo Strategy ✅

**Demo Strategy (KILLER MOVE):**
- Stage 1: Remotion-produced cinematic 3-min video for async judging
- Stage 2: Live Twilio number — judges text it IN REAL TIME during the final round
- "Take out your phone and text this number" — every judge becomes a user
- Not a demo. A product launch in the judging room.

**`server.js` — Production Hardened:**
- Added `GET /` health check — returns JSON with system status, inventory count, uptime
- Added `GET /sms` — browser-verifiable webhook URL
- Added `process.on('uncaughtException')` — server never crashes, keeps serving
- Added `process.on('unhandledRejection')` — async errors caught, server stays up
- 5 judges texting simultaneously won't kill the server

**Deployment Checklist (for live demo):**
- [ ] Deploy to Railway / Render / Fly.io (public URL needed for Twilio webhook)
- [ ] Set Twilio webhook URL to `https://[deployed-url]/sms`
- [ ] Run `setup.sql` in Supabase SQL Editor
- [ ] Test with real SMS end-to-end
- [ ] Verify health check at `GET /`

---

### 18:00 — SMS User Manual + Smarter Vendor Detection ✅

**Help System — The manual that respects its own medium:**

Every help response fits in a single SMS. The system teaches itself through the constraint.

| Command | Length | Response |
|---------|--------|----------|
| `help` / `?` / `menu` | 133/160 | Main guide with all routes |
| `help vendor` / `help sell` | 130/160 | How to post supply updates |
| `help search` / `help find` | 132/160 | How to search for items |
| `help home` / `help area` | 134/160 | How to set your Home Node |

**Smarter Vendor Detection:**
- Expanded supply verbs: `got`, `selling`, `stock`, `update`, `have`, `available`, `special`
- Added price pattern matching: `/\bR\d+/` — detects "R35", "R95", etc.
- Combined signal: supply verb + price pattern = high-confidence supply intent
- If vendor hasn't set Home Node, nudge them: "Tip: text 'home [your area]' so buyers can find you nearby"

**Routing now has 4 modes:**
0. `help` / `?` → User manual (no API call, instant)
1. `home [area]` → Home Node registration
2. `selling [item R00]` → Supply update (with area nudge if no Home Node)
3. Any other query → Demand search with extended thinking

---

### 18:30 — Multilingual Supply Verbs + Inventory Decay ✅

**Multilingual Supply Detection — 11 SA languages:**

Vendors can now announce stock in their mother tongue and the system correctly indexes it.

| Language | Example SMS | Detected? |
|----------|-------------|-----------|
| English | "Selling chicken R35 quarter" | ✅ |
| isiZulu | "Ngidayisa inkukhu R35" | ✅ |
| isiXhosa | "Ndithengisa inyama R50" | ✅ |
| Sesotho | "Ke rekisa samente R95" | ✅ |
| Afrikaans | "Verkoop hoender R40" | ✅ |
| isiZulu (alt) | "Kukhona isemende R95" | ✅ |
| Xitsonga | "Ndzi xavisa cement R95" | ✅ |
| Tshivenda | "Ndi khou rengisa tshikeni R35" | ✅ |

Demand queries ("Cheapest cement?" / "malini ugwayi?") correctly NOT flagged as supply. Zero false positives.

**Inventory Decay — The Final Dungeon Boss, Defeated:**

Stock in the township moves fast. The database now reflects that.

| Age | Label | Visibility |
|-----|-------|------------|
| < 1h | `just now` | 👁️ Visible, high confidence |
| < 6h | `Xh ago, fresh` | 👁️ Visible, reliable |
| < 24h | `Xh ago, verify` | 👁️ Visible, flagged for Claude to caveat |
| > 24h | `expired` | 🚫 Hidden from all queries |

- Decay is **passive** — no cron jobs, happens at query time
- Every inventory item gets a `freshness` field injected into Claude's context
- Claude is instructed to prioritize "fresh" entries and flag "verify" ones as unconfirmed
- Expired entries purged on server boot + every supply write
- Health check (`GET /`) now shows live/fresh/aging counts

---

### 21:20 — Repo initialized + deploy prep ✅

**Git** — repo initialized on `main`, two commits:
- `ead49a8` Initial commit — Source SMS build through Day 3
- `5ef50a1` Add deploy scripts, .env.example, project metadata

Public at `https://github.com/Mowngezi/short-message-search`. Open-source for judges.

**Deploy-readiness fixes** applied to `package.json`:
- Added `"start": "node server.js"` — Railway/Render can now auto-detect boot command (this was a hard deploy blocker)
- Added `"dev": "node --watch server.js"` for local iteration
- Added `"sandbox": "node sandbox.js"` for the REPL
- Proper description, author, MIT license, `engines.node: ">=20"`
- Keywords for repo discoverability: sms, twilio, anthropic, claude, opus-4.7, informal-economy

**`.env.example`** — all 7 env vars documented so judges cloning the repo can configure locally without guessing.

**`DEPLOY.md`** — 6-step runbook for shipping to Railway (project → env vars → public URL → Twilio webhook → live SMS test → warm-up cron). End-to-end in ~15 minutes. Includes rollback instructions and a post-deploy checklist.

**Fresh engineering audit** — original ASSESSMENT scored Depth & Execution 4/10 based on a pre-fix snapshot. Post-CHANGELOG re-audit: **6.5/10**.
- Engineering sound: 6/10 — no syntax errors, end-to-end routing works, decay logic correct
- Thoughtfully refined: 7/10 — 140-trick is elegant, extended thinking correctly wired, 11-language supply detection
- Real craft: 6/10 — compression engine is real, supply/demand split is well-thought, rough edges on validation + RLS

Holding the score back: wide-open Supabase RLS (`FOR ALL USING (true)`), no input validation on `extractLocation()`/`raw_update`, `gateway.js` CLI doesn't use extended thinking (mixed messaging), no Twilio 401/rate-limit handling. None blocking — all stress-test risk for judging.

---

### 21:22 — Stress-test harness ✅

**`scripts/stress-test.js`** — fires 30+ realistic SMS queries at the live `/sms` webhook in bounded-concurrency batches. Measures:
- Latency p50/p95/max
- SMS compliance: flags anything over 160 chars (the hard submission requirement)
- Per-route pass/fail breakdown (help/home/supply/demand)
- Full per-query CSV audit trail (`scripts/results-<stamp>.csv`)

**Query suite covers:**
- All 4 routes (help, home, supply, demand)
- 11 SA languages on the supply path
- isiZulu + isiXhosa + Setho-mix on the demand path
- Edge cases: price in a demand query (must NOT misroute as supply), "selling" without a price (must NOT trip supply), long 200-char queries, mixed-language
- Stable fake phone numbers so Supabase `user_profiles` stays tidy

**Usage:**
```bash
BASE_URL=https://<deployed-url>/ node scripts/stress-test.js
```

**Why this matters for judging:** a CSV with latency histogram + 100% 160-char compliance across 11 languages is a real "we tested this at scale" signal. Burns Anthropic Console credits, not chat quota.

---

### 21:45 — Inventory persistence via Supabase ledger ✅

**Problem:** Railway's filesystem is ephemeral. Every container restart wipes `inventory.json`, so vendor supply vanishes between boots. Mid-demo risk.

**Conceptual reframe (Mow's):** the audit log *is* the inventory. Every supply message is a market event. The market has always remembered who said what and when — `inventory.json` was just a cache we forgot to treat like one.

**Shipped:**
- New `inventory_ledger` table in `setup.sql` with `(vendor_phone, raw_update, geo_tag, created_at)` + a descending index on `created_at` for the hot boot query.
- `logSupplyToLedger()` in `server.js` — every Route 2 (supply) write now fire-and-forgets a row into Supabase. Non-blocking: the SMS reply doesn't wait on the ledger write.
- `rebuildInventoryFromLedger()` — boot-time query for the last 24h (same window as `DECAY_WINDOW_HOURS`) that rehydrates `inventory.json` before the server accepts traffic.
- Boot sequence refactored into `async function boot()` so rebuild completes before `app.listen()` fires. Restart is now harmless.

**What we explicitly did NOT do:** wrap the boot rebuild in a Claude routine. Routines are for scheduled or event-triggered Claude work — PR reviews, nightly decay sweeps, reputation scans. A boot-time DB read is not that shape of problem. Adding the routine machinery here would be ceremony, not substance. Noted future use in the roadmap: nightly decay sweep + weekly vendor-reliability scan.

**Opus 4.7 scorecard after this change — what's earning the model's keep:**
1. Adaptive extended thinking on demand queries (genuine reasoning, not a latency flex)
2. Native multilingual inference across 11 SA languages with zero translation layer
3. 140-char self-constraint compression (prompt-level discipline, prevents 160 overflow)
4. The user manual itself fits SMS — the product eats its own dog food

**Still deferred by design:** 1M context window (unused — SMS doesn't need it; restraint is the flex), routines (correct shape of problem hasn't appeared in the core loop).

---

*Entries will be added as changes are made. Each entry includes what changed, why, and what it unlocks.*
