# Source · Cerebral Valley "Built with Opus 4.7" submission

## Blurb (locked, 177 words)

Source is an SMS intelligence layer for South Africa's informal economy. No app. No data. Just a number.

Gogo walks 90 minutes to find out her clinic has run out of BP meds. She texts Source instead. "alex clinic bp meds today". Gets opening hours, stock, queue cutoff. 30 seconds, zero airtime.

Themba waits 30 minutes for a kombi to chase a cement price he heard from a friend. He texts "cement near 3rd ave" → real vendor, real price, real distance. The kombi stays parked.

Thando loses hours every day because his stock is invisible to buyers two streets over. He texts "got cement R95 alex 3rd ave". Themba's next query surfaces it.

Claude Opus 4.7 does the work: adaptive thinking compresses every response to 160 characters, multilingual across South Africa's 11 official languages. The same backend processes browser simulations and live SMS via Twilio webhook. No mocks.

Source gives Claude access to people even Google can't reach.

This isn't search. It's the market routing itself, over a number.

---

## Time-factor per persona (the spine)

| Persona | Old workflow | With Source |
|---|---|---|
| Gogo (clinic) | 90 min walk + risk wasted trip | 30 sec text, R0 airtime |
| Themba (cement buyer) | 30 min kombi wait + wrong-price ride | text → real vendor, kombi stays parked |
| Thando (vendor) | hours of invisible stock | one text → indexed, surfaced to buyers |

---

## Pitch beats (for video + about page reuse)

- **Hook**: "Google mapped the internet. The informal economy doesn't live there."
- **Mechanism**: Twilio webhook → Claude Opus 4.7 with adaptive thinking → 160-char compression → SMS reply
- **Proof**: Same backend serves browser sim at /try and live SMS. Judges can verify by checking Railway logs
- **Differentiator**: Multilingual (11 SA languages), supply + demand routing in one channel, no apps, no data

---

## Demo links (to fill in)

- Live SMS: +1 579 589 0008
- Browser sim: https://short-message-search-production.up.railway.app/try
- About: https://short-message-search-production.up.railway.app/about (in progress)
- Repo: [add]
- Video: [add]
