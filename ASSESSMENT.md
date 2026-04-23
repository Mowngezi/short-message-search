# Source SMS — Project Assessment

> "Allowing Claude to reach people even Google can't."

## What Is Source SMS?

An offline intelligence proxy over SMS. Users on feature phones in South African townships text a question — Claude Opus 4.7 compresses a factually dense answer into ≤160 characters and sends it back. No app. No data bundle. No onboarding.

The system has three routing modes:
- **Demand Route** — Themba texts "cheapest cement near 3rd Ave?" → Claude responds with price + location
- **Supply Route** — Thando texts "Got 50 bags Afrisam cement, R95" → system logs it as live inventory
- **Public Utility Route** — Gogo texts "Is Alex clinic open today?" → Claude retrieves best available signal

---

## Judging Criteria Breakdown

### 🟢 Impact (30%) — STRONGEST PILLAR

| Question | Score | Why |
|----------|-------|-----|
| Real-world potential? | 10/10 | Digital inclusion for 30M+ offline South Africans |
| Who benefits? | 10/10 | Feature phone users in township economies — most underserved population |
| Could it become real? | 9/10 | SMS infrastructure already exists, Twilio is production-ready |
| Problem Statement fit? | 10/10 | **#1: "Build From What You Know"** — real problem, real place, real community |

**Key narrative frames:**
1. **The Information Tax** — being offline costs taxi fare + time just to ask a question
2. **The Dignity of Certainty** — replacing rumors and queues with verified answers
3. **The Digitization Penalty** — the world moved online and left Gogo behind

---

### 🟡 Demo (25%) — NEEDS END-TO-END FLOW

| Question | Score | Status |
|----------|-------|--------|
| Working demo? | 6/10 | Sandbox REPL works, server has bugs |
| Holds up live? | 5/10 | Needs Twilio webhook tested end-to-end |
| Genuinely cool? | 8/10 | isiZulu query returning code-switched compressed answers is genuinely wild |

**What makes the demo special:**
- Multilingual queries (isiZulu → compressed English/Zulu response)
- 160-char hard compression with real pricing data
- Zero onboarding — just text and get answers

---

### 🟡 Opus 4.7 Use (20%) — GOOD, NEEDS EXTENDED THINKING

| Question | Score | Status |
|----------|-------|--------|
| Creative use? | 7/10 | Compression engine + semantic GPS + multilingual reasoning |
| Beyond basic integration? | 6/10 | Need extended thinking, Home Node memory |
| Surprised even us? | 7/10 | isiZulu code-switching in 160 chars would surprise anyone |

**What makes Opus 4.7 specifically essential:**
- Multilingual reasoning — understanding isiZulu slang + township geography
- Compression intelligence — not just truncating, but *reasoning* about what to keep
- Cultural context — knowing "Alex" = Alexandra, "spaza" = informal shop
- The 140-char internal limit trick — telling Claude 140 so it never overflows 160

---

### 🟡 Depth & Execution (20%) — FIX THE BUGS

| Question | Score | Status |
|----------|-------|--------|
| Engineering sound? | 4/10 | Has syntax bugs, missing deps |
| Thoughtfully refined? | 6/10 | Good architecture, needs cleanup |
| Real craft? | 5/10 | Supply/demand routing concept is strong, implementation incomplete |

---

## Prize Targeting

| Prize | Fit | Strategy |
|-------|-----|----------|
| **"Keep Thinking" ($5K)** | ⭐⭐⭐⭐⭐ | *"A real-world problem nobody thought to point Claude at."* — This is us. |
| **Most Creative Opus 4.7 ($5K)** | ⭐⭐⭐⭐ | Extended thinking + multilingual compression = creative Opus use |
| **Best Managed Agents ($5K)** | ⭐⭐ | Not using Managed Agents currently |

---

## Timeline

- **Submissions due:** Sunday, April 26, 8:00 PM EST
- **Stage 1 (Async Judging):** April 26-27
- **Stage 2 (Final Round):** April 28, 12:00 PM EST
- **Top 6 announced + Top 3 revealed:** April 28

## Required Deliverables

1. 3-minute demo video (YouTube/Loom)
2. GitHub repository / code link
3. Written summary (100–200 words)
4. All work built during hackathon period
