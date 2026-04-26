# Source · Demo Video Script

**Target length:** 2:45 (Cerebral Valley accepts up to 3 min)
**Voice tone:** documentary, not announcer. Calm, deliberate, period stops, no excitement spikes.
**Filming surface:** primarily the `/try` page (browser screen recording). One cutaway to a real phone showing the Twilio number receiving an SMS, to anchor the "real backend" claim.
**Music:** none, or a single very subtle ambient bed at low volume. Silence on the closer.

---

## Beat sheet

| # | Time | Beat | What's on screen | Voiceover |
|---|---|---|---|---|
| 0 | 0:00 – 0:06 | Thesis | Cream background. Italic serif, centered: *"We gave Claude access to people even Google can't reach."* fades up, holds, fades. Bookends the closer. | "We gave Claude access to people even Google can't reach." |
| 1 | 0:06 – 0:13 | Hook | Black. "Source" fades up in serif italic, holds, fades. | "Google mapped the internet. But the informal economy never moved there." |
| 2 | 0:13 – 0:37 | Problem | Cut to a hand holding a feature phone (tilili). Slow pan. Cut to /try page idle. | "In South Africa, millions still use feature phones. Not as a fallback. As a primary tool. They're reliable. They're affordable. They work. Even people with smartphones still carry one. But modern systems are built for apps, not for them." |
| 3 | 0:37 – 1:10 | Gogo | /try page. Cursor enters input field. Types "alex clinic bp meds today". Hit send. Trace lines appear: interpreting, matching local signals, compressing. Response writes onto the green Nokia screen. Meta line: "{n} chars · {x.x}s". | "Gogo walks ninety minutes to her clinic. To her, anything that isn't SMS is 'computers'. And computers were never for her. Source is a text. Now she texts. Same familiar interface. Thirty seconds. Zero data." |
| 4 | 1:10 – 1:30 | Thando lists | /try. Type "got cement R95 alex 3rd ave". Trace runs. Response: stock logged. | "Thando lists his cement stock. One text. No website. No upload. No onboarding." |
| 5 | 1:30 – 2:00 | Themba arrives (the platform moment) | /try. Clear screen. Type "cement near 3rd ave". Trace runs. Response surfaces Thando's vendor entry, with phone, distance, and freshness. Hold on the screen for a beat. | "Themba was about to spend thirty minutes on a taxi to chase a price he heard from a friend. Instead, he texts. He saves a taxi fare. That's not search. That's the market answering." |
| 6 | 2:00 – 2:30 | Schema break · Mechanism reveal | source-idle.mov full-bleed in background, dark scrim over it, two schema-break lines fade in over the very device the listener is looking at. Then quick cuts: Railway log scroll, Twilio dashboard, SYSTEM_PROMPT block. | "The phone can't run AI. The number can." *(2-second held beat)* "Claude Opus 4.7. Adaptive thinking. Every response compressed 160 characters. Multilingual across all eleven South African languages. The browser simulation and live SMS hit the same backend. No mock layer." |
| 7 | 2:30 – 2:47 | Closer | Back to /try, idle, clean. Slow zoom out. | "Source gives Claude access to people even Google can't reach. This isn't search. It's the market routing itself. Over a number." |
| 8 | 2:47 – 2:50 | End card | Static card on cream background. Top: "Source" in serif italic. Middle: "+1 579 589 0008". Bottom: small mono "Built with Claude Opus 4.7 · Cerebral Valley 2026". | (silence) |

---

## Optional final beat (your arc)

If you want to land the personal mission, replace the silent end card with:

> **VO (8s, low volume):** "I came from advertising. Campaigns end. Platforms route."

Adds one line of personal stake without making the video about you. Keep or drop, your call.

---

## Production notes

**Recording the /try demos**
- Use QuickTime screen recording on Mac (Cmd+Shift+5, area capture).
- Record at 1920×1080 or 1440p. Crop in post.
- Run each query with Railway already warmed (one dummy query before recording so Claude's first response isn't cold-start slow).
- The trace cadence is 380ms per line. With Claude responding in ~3-5s, the trace finishes first and the response lands cleanly. If a take feels too slow, drop trace cadence to 280ms in the JS.

**The cutaway (mechanism beat)**
- Open Railway logs in a separate window. Run a real query against the Twilio number from your phone while recording the browser logs to capture the inbound webhook + outbound TwiML. ~5 seconds of log scroll is plenty.
- For the Twilio dashboard shot, just navigate to the Phone Numbers page and the messaging logs view.

**Voiceover**
- Record after the video is cut. Read each beat at the pace the visual gives you.
- Lower your voice. Documentary, not infomercial.
- No smiles in the audio. Periods, not exclamations.
- If your accent is SA, lean into it. The story is SA. The voice should be too.

**Don't include**
- Faces. Hands holding the phone are fine.
- Code on screen for more than 2 seconds (judges aren't reading it; they're reading what it implies).
- Music swells, sound effects, transitions other than hard cuts.
- The phrase "we believe," "we set out to," or "we're excited to."
- Em dashes (already locked, but worth restating since this script is voice over and we don't want to read into a pause where one would have been).

---

## Asset checklist before recording

- [ ] /try page deployed with latest copy (em-dash-free, trace + latency working)
- [ ] Railway warmed (one dummy SMS query)
- [ ] Twilio dashboard logged in, message log view ready
- [ ] /try open in incognito so no autocomplete suggestions appear
- [ ] Browser zoom at 100%, window at standard 1280×800 or 1440×900
- [ ] Phone with the real Twilio number ready for the cutaway
- [ ] Inventory pre-seeded: send "got cement R95 alex 3rd ave" once before recording so Themba's query has something to match

---

## End-card alt copy (pick one)

1. *"Built with Claude Opus 4.7 · Cerebral Valley 2026"* (current, neutral)
2. *"Source · The market routes itself"* (mantra, on-brand)
3. *"+1 579 589 0008 · text it yourself"* (provocation, invites judges to verify)
