require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ──────────────────────────────────────────────
// THE SYSTEM PROMPT — Compression Engine Core
// ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Source-SMS routing engine, an offline intelligence proxy.
Your objective is to answer the user's query with maximum factual density.
You serve users on feature phones in South African townships (e.g., Alexandra, Khayelitsha).

CRITICAL CONSTRAINTS:
1. HARD LIMIT: Final response MUST be under 140 characters. No exceptions.
2. ZERO FLUFF: Never say "Hello", "Here is...", or "As an AI...". Start immediately with data.
3. COMPRESSION: Use heavy abbreviations (e.g., max, min, JHB, PTA, avg, R for Rand).
4. NO APOLOGIES: If asked for live data (e.g., "next train"), DO NOT say "I cannot check live schedules". Instead, immediately provide the standard heuristic (e.g., intervals, operating hours, baseline prices).
5. FORMATTING: Raw text only. No markdown, bolding, or asterisks.
6. MULTILINGUAL: Understand isiZulu, isiXhosa, Setswana, Sesotho, Afrikaans, and township slang. Respond in the same language or code-switch naturally.

If the query is conversational, ignore pleasantries. Deliver pure, structured utility.`;

// ──────────────────────────────────────────────
// LOCAL INVENTORY (Supply Route Data)
// ──────────────────────────────────────────────
const INVENTORY_PATH = './inventory.json';

function readInventory() {
    try {
        const data = fs.readFileSync(INVENTORY_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { inventory: [] };
    }
}

function writeInventory(data) {
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────────
// HOME NODE — Semantic GPS via Supabase
// ──────────────────────────────────────────────

// Look up a user's saved location (their "Home Node")
async function getUserProfile(phoneNumber) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('geo_tag')
            .eq('phone_number', phoneNumber)
            .single();

        if (error || !data) return null;
        return data;
    } catch {
        return null;
    }
}

// Save a user's Home Node location
async function saveUserHome(phoneNumber, locationText) {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .upsert({
                phone_number: phoneNumber,
                geo_tag: locationText.trim()
            });

        if (error) {
            console.error('[❌ Home Node Error]', error.message);
            return false;
        }
        console.log(`[🏠 HOME NODE SET] ${phoneNumber} → "${locationText.trim()}"`);
        return true;
    } catch {
        return false;
    }
}

// Detect if a message is a "set home" command
function isHomeCommand(message) {
    const lower = message.toLowerCase().trim();
    return lower.startsWith('home ') || lower.startsWith('📍') || lower.startsWith('location ');
}

// Extract the location from a home command
function extractLocation(message) {
    const lower = message.toLowerCase().trim();
    if (lower.startsWith('home ')) return message.substring(5).trim();
    if (lower.startsWith('📍')) return message.substring(2).trim();
    if (lower.startsWith('location ')) return message.substring(9).trim();
    return message.trim();
}

// ──────────────────────────────────────────────
// HELP SYSTEM — The User Manual, in SMS
// Every response fits in a single SMS (≤160 chars).
// The manual respects its own medium.
// ──────────────────────────────────────────────
const HELP_RESPONSES = {
    main:    "Source-SMS: Ask anything in any language! Vendors: start w/ 'selling'. Set area: 'home [place]'. More: 'help vendor' or 'help search'",
    vendor:  "Vendor guide: Text like 'Selling chicken R35 quarter' or 'Got cement 50kg R95'. Include item+price. Set area first: 'home [place]'",
    search:  "Search guide: Ask naturally! 'cheapest cement near 3rd Ave?' or 'malini ugwayi e-Alex?' Set area w/ 'home [place]' for local results",
    home:    "Home Node: Text 'home Alex 3rd Ave' to save your area. All future queries auto-use your location. Change anytime w/ new 'home [place]'",
};

function isHelpCommand(message) {
    const lower = message.toLowerCase().trim();
    return lower === 'help' || lower === '?' || lower === 'menu'
        || lower.startsWith('help ');
}

function getHelpResponse(message) {
    const lower = message.toLowerCase().trim();
    if (lower === 'help vendor' || lower === 'help sell' || lower === 'help supply') return HELP_RESPONSES.vendor;
    if (lower === 'help search' || lower === 'help find' || lower === 'help buy') return HELP_RESPONSES.search;
    if (lower === 'help home' || lower === 'help location' || lower === 'help area') return HELP_RESPONSES.home;
    return HELP_RESPONSES.main;
}

// ──────────────────────────────────────────────
// INTENT DETECTION — Supply vs Demand
// Soft rules, clear enough to index correctly.
// Vendors write like they talk: "Selling X R00"
// Multilingual: supply verbs in all 9+ SA languages
// so every vendor can post in their mother tongue.
// ──────────────────────────────────────────────
const SUPPLY_VERBS = [
    // English
    'got ', 'selling ', 'stock ', 'stock:', 'update ',
    'have ', 'available ', 'special ',
    // isiZulu
    'ngidayisa ',    // I'm selling
    'ngithengisa ',  // I'm selling (formal)
    'nginako ',      // I have
    'kukhona ',      // there is / available
    // isiXhosa
    'ndithengisa ',  // I'm selling
    'ndinako ',      // I have
    'kukho ',        // there is / available
    // Sesotho
    'ke rekisa ',    // I'm selling
    'ke nale ',      // I have
    'ho nale ',      // there is
    // Setswana
    'ke rekisa ',    // I'm selling (same as Sesotho)
    'ke nale ',      // I have
    'go nale ',      // there is
    // Sepedi (Sesotho sa Leboa)
    'ke rekiša ',    // I'm selling
    'ke nale ',      // I have
    // Afrikaans
    'verkoop ',      // selling
    'het ',          // have (short, common)
    'beskikbaar ',   // available
    // Xitsonga
    'ndzi xavisa ',  // I'm selling
    'ndzi nayo ',    // I have
    // Tshivenda
    'ndi khou rengisa ', // I'm selling
    'ndi nayo ',     // I have
    // siSwati
    'ngiyatsengisa ', // I'm selling
    'nginako ',      // I have
    // isiNdebele
    'ngiyathengisa ', // I'm selling
    'nginakho ',     // I have
];

function detectSupplyIntent(message) {
    const lower = message.toLowerCase();

    // Check against all multilingual supply verbs
    const startsWithVerb = SUPPLY_VERBS.some(v => lower.startsWith(v));

    // Price pattern backup — "R" + number is a universal supply signal
    // e.g., "Chicken R35" or "isemende R95"
    const hasPricePattern = /\bR\d+/i.test(message);

    // Strong signal: starts with any supply verb (any language)
    // Boosted signal: supply verb + price pattern
    return startsWithVerb || (startsWithVerb && hasPricePattern);
}

// ──────────────────────────────────────────────
// INVENTORY DECAY — The Final Dungeon Boss
// Stock in the township moves fast. Yesterday's
// prices are today's lies. Entries decay over time:
//   < 6h  = FRESH  (high confidence)
//   < 24h = AGING  (still useful, flag it)
//   > 24h = STALE  (excluded from queries)
// Decay happens at query time — no cron needed.
// ──────────────────────────────────────────────
const DECAY_WINDOW_HOURS = 24; // Hard cutoff: entries older than this are invisible
const FRESH_WINDOW_HOURS = 6;  // Entries younger than this are marked "fresh"

function getAgeHours(timestamp) {
    return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
}

function getFreshnessLabel(ageHours) {
    if (ageHours < 1) return 'just now';
    if (ageHours < FRESH_WINDOW_HOURS) return `${Math.round(ageHours)}h ago, fresh`;
    if (ageHours < DECAY_WINDOW_HOURS) return `${Math.round(ageHours)}h ago, verify`;
    return 'expired'; // shouldn't reach here after filtering
}

// Filter and tag inventory — called at query time
function getLiveInventory() {
    const db = readInventory();
    if (!db.inventory || db.inventory.length === 0) return [];

    return db.inventory
        .map(entry => {
            const age = getAgeHours(entry.timestamp);
            return { ...entry, age_hours: Math.round(age), freshness: getFreshnessLabel(age) };
        })
        .filter(entry => entry.age_hours < DECAY_WINDOW_HOURS);
}

// Passive cleanup — purge expired entries on write (keeps file clean)
function purgeExpiredInventory() {
    const db = readInventory();
    if (!db.inventory) return;

    const before = db.inventory.length;
    db.inventory = db.inventory.filter(entry => getAgeHours(entry.timestamp) < DECAY_WINDOW_HOURS);
    const purged = before - db.inventory.length;

    if (purged > 0) {
        writeInventory(db);
        console.log(`[🗑️ DECAY] Purged ${purged} expired entries`);
    }
}

// ──────────────────────────────────────────────
// INVENTORY LEDGER — Supabase persistence
// Railway's filesystem is ephemeral. The audit log IS the
// inventory: every supply message is written to the ledger,
// and on boot we rehydrate `inventory.json` from the last
// DECAY_WINDOW_HOURS of ledger rows. Restart is harmless.
// ──────────────────────────────────────────────

// Write a supply entry to Supabase (fire-and-forget, non-blocking)
async function logSupplyToLedger(entry) {
    try {
        const { error } = await supabase
            .from('inventory_ledger')
            .insert([{
                vendor_phone: entry.vendorPhone,
                raw_update: entry.raw_update,
                geo_tag: entry.geo_tag,
                created_at: entry.timestamp, // preserve the client-side timestamp
            }]);
        if (error) {
            console.error('[❌ Ledger Error]', error.message);
            return false;
        }
        console.log('[📒 LEDGER] Supply row persisted');
        return true;
    } catch (err) {
        console.error('[❌ Ledger Exception]', err.message);
        return false;
    }
}

// Rehydrate inventory.json from Supabase on boot.
// Runs BEFORE the server starts accepting traffic so the first
// demand query sees the full market, not an empty inventory.
async function rebuildInventoryFromLedger() {
    try {
        const cutoff = new Date(Date.now() - DECAY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('inventory_ledger')
            .select('vendor_phone, raw_update, geo_tag, created_at')
            .gte('created_at', cutoff)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[❌ Rebuild Error]', error.message, '— starting with existing cache');
            return -1;
        }

        if (!data || data.length === 0) {
            console.log('[📦 REBUILD] Ledger empty for last 24h — starting with existing cache');
            return 0;
        }

        // Map ledger rows back to the in-memory shape the rest of the server expects.
        const rebuilt = data.map(row => ({
            vendorPhone: row.vendor_phone,
            raw_update: row.raw_update,
            timestamp: row.created_at,
            geo_tag: row.geo_tag || 'unknown',
        }));

        writeInventory({ inventory: rebuilt });
        console.log(`[📦 REBUILD] Hydrated ${rebuilt.length} supply entries from ledger (last ${DECAY_WINDOW_HOURS}h)`);
        return rebuilt.length;
    } catch (err) {
        console.error('[❌ Rebuild Exception]', err.message, '— starting with existing cache');
        return -1;
    }
}

// ──────────────────────────────────────────────
// THE COMPRESSION ENGINE — with Extended Thinking
// Uses Opus 4.7's internal reasoning to think
// deeply before compressing to 140 chars.
// Now with decay-aware inventory context.
// ──────────────────────────────────────────────
async function runCompressionRoutine(userQuery, userGeoTag) {
    console.log(`[🧠 Agent Thinking...] "${userQuery}"`);

    // Pull LIVE inventory (decay-filtered + freshness-tagged)
    const liveInventory = getLiveInventory();
    const hasInventory = liveInventory.length > 0;

    if (hasInventory) {
        console.log(`[📦 INVENTORY] ${liveInventory.length} live items (${liveInventory.filter(i => i.freshness.includes('fresh')).length} fresh)`);
    }

    // Build dynamic context blocks with freshness metadata
    const inventoryBlock = hasInventory
        ? `\n\nLOCAL SUPPLY DATABASE (Live, decay-filtered):\n${JSON.stringify(liveInventory)}\nEach entry has a "freshness" field. Prioritize "fresh" entries. Flag "verify" entries as unconfirmed. Include vendor geo_tag in your response.`
        : '';

    const locationBlock = userGeoTag
        ? `\n\nUSER LOCATION (Home Node): The user is located near ${userGeoTag}. Prioritize results closest to this area.`
        : '';

    try {
        const msg = await anthropic.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 16000,
            // ── EXTENDED THINKING ──
            // This is the Opus 4.7 superpower. Claude reasons internally
            // about what the user needs, what context matters, and HOW
            // to compress maximum value into 140 characters — before
            // generating the final response.
            thinking: {
                type: "adaptive"
            },
            // Force deep reasoning — we need Claude to THINK hard
            // about compression, not just fire off a quick answer.
            output_config: {
                effort: "high"
            },
            system: SYSTEM_PROMPT + inventoryBlock + locationBlock,
            messages: [{ role: "user", content: userQuery }],
        });

        // Extended thinking returns multiple content blocks:
        // [{ type: "thinking", thinking: "..." }, { type: "text", text: "..." }]
        const thinkingBlock = msg.content.find(block => block.type === 'thinking');
        const textBlock = msg.content.find(block => block.type === 'text');

        if (thinkingBlock) {
            console.log(`[💭 Extended Thinking] ${thinkingBlock.thinking.substring(0, 300)}...`);
        }

        const output = textBlock ? textBlock.text : "No response generated.";
        console.log(`[🟢 Agent Finished] Length: ${output.length}/160`);
        return { text: output, charCount: output.length, thinking: thinkingBlock?.thinking || '' };
    } catch (error) {
        console.error('[❌ Agent Error]', error.message);
        return { text: "System busy. Try again.", charCount: 0, thinking: '' };
    }
}

// ──────────────────────────────────────────────
// THE WEBHOOK — Twilio SMS Entry Point
// ──────────────────────────────────────────────
app.post('/sms', async (req, res) => {
    const incomingMessage = req.body.Body;
    const senderNumber = req.body.From;

    console.log(`\n======================================`);
    console.log(`[📥 SMS IN] From: ${senderNumber} | Message: "${incomingMessage}"`);

    let responseText;

    // ── ROUTE 0: Help / User Manual ──
    if (isHelpCommand(incomingMessage)) {
        responseText = getHelpResponse(incomingMessage);
        console.log(`[📖 HELP] Served: ${incomingMessage}`);

    // ── ROUTE 1: Home Node Registration ──
    } else if (isHomeCommand(incomingMessage)) {
        const location = extractLocation(incomingMessage);
        const saved = await saveUserHome(senderNumber, location);
        responseText = saved
            ? `Home set: ${location}. Future queries will use your area for local results.`
            : "Couldn't save location. Try again.";

    // ── ROUTE 2: Supply Update (Thando) ──
    } else if (detectSupplyIntent(incomingMessage)) {
        // If vendor has a Home Node, use it as their geo_tag
        const profile = await getUserProfile(senderNumber);
        const geoTag = profile?.geo_tag || null;
        const db = readInventory();
        const newEntry = {
            vendorPhone: senderNumber,
            raw_update: incomingMessage,
            timestamp: new Date().toISOString(),
            geo_tag: geoTag || "unknown"
        };
        db.inventory.push(newEntry);
        writeInventory(db);
        purgeExpiredInventory(); // Clean up stale entries on every write
        // Persist to Supabase ledger so the entry survives a container restart.
        // Fire-and-forget: we do NOT block the SMS response on the ledger write —
        // the local cache is authoritative for the current session, the ledger
        // is insurance for the next boot.
        logSupplyToLedger(newEntry).catch(err => console.error('[❌ Ledger Write]', err.message));
        console.log(`[💾 SUPPLY LOGGED] ${incomingMessage}`);
        // If vendor hasn't set their area, nudge them
        responseText = geoTag
            ? "Stock logged. You're now visible to local searches today."
            : "Stock logged! Tip: text 'home [your area]' so buyers can find you nearby.";

    // ── ROUTE 3: Demand Query (Themba / Gogo) ──
    } else {
        // Look up user's Home Node for location context
        const profile = await getUserProfile(senderNumber);
        const geoTag = profile?.geo_tag || null;

        if (geoTag) {
            console.log(`[🏠 HOME NODE] Using saved location: "${geoTag}"`);
        } else {
            console.log(`[🏠 HOME NODE] No location saved for this number`);
        }

        const aiResponse = await runCompressionRoutine(incomingMessage, geoTag);
        responseText = aiResponse.text;

        // Log full exchange to Supabase
        const { error } = await supabase
            .from('sms_exchanges')
            .insert([{
                phone_number: senderNumber,
                inbound_query: incomingMessage,
                outbound_response: responseText,
                token_count: aiResponse.charCount
            }]);

        if (error) console.error('[❌ DB Error]', error.message);
        else console.log('[✅ DB Logged]');
    }

    // Reply via Twilio
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(responseText);

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    console.log(`[📤 SMS OUT] "${responseText}"`);
    console.log(`[📏 CHAR COUNT] ${responseText.length}/160`);
    console.log(`======================================\n`);
});

// ──────────────────────────────────────────────
// HEALTH CHECK — For deployment & uptime monitoring
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
    const liveItems = getLiveInventory();
    const freshCount = liveItems.filter(i => i.freshness.includes('fresh')).length;
    const agingCount = liveItems.filter(i => i.freshness.includes('verify')).length;
    res.json({
        status: '🔥 Source-SMS is live',
        version: '1.0.0',
        routes: {
            help: 'Text "help" → user manual',
            demand: 'Text any question → compressed answer',
            supply: 'Text "selling [item R00]" → logs to local inventory',
            home: 'Text "home [area]" → sets your location'
        },
        stats: {
            live_inventory: liveItems.length,
            fresh: freshCount,
            aging: agingCount,
            decay_window: DECAY_WINDOW_HOURS + 'h',
            uptime: process.uptime().toFixed(0) + 's'
        },
        languages: '🇿🇦 EN, isiZulu, isiXhosa, Sesotho, Setswana, Sepedi, Afrikaans, Xitsonga, Tshivenda, siSwati, isiNdebele'
    });
});

// Also respond to GET /sms so you can verify webhook URL in browser
app.get('/sms', (req, res) => {
    res.send('Source-SMS webhook is live. POST to this endpoint with Twilio.');
});

// ──────────────────────────────────────────────
// GLOBAL ERROR HANDLING — No crashes during live demo
// ──────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('[💀 UNCAUGHT]', err.message);
    // Don't crash — keep serving
});

process.on('unhandledRejection', (err) => {
    console.error('[💀 UNHANDLED REJECTION]', err);
    // Don't crash — keep serving
});

const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
// BOOT SEQUENCE
// 1. Rehydrate inventory from the Supabase ledger (survives Railway restarts)
// 2. Purge anything past the decay window (safety net)
// 3. Start accepting traffic
// ──────────────────────────────────────────────
async function boot() {
    await rebuildInventoryFromLedger();
    purgeExpiredInventory();
    const live = getLiveInventory();

    app.listen(PORT, () => {
        console.log(`\n🔥 Source-SMS Gateway running on port ${PORT}`);
        console.log(`📡 Webhook: POST /sms`);
        console.log(`📖 Help: Text "help" / "?" / "menu"`);
        console.log(`🏠 Home Node: Text "home [area]" to set location`);
        console.log(`📦 Supply: Text "selling/got [item R00]" (11 languages)`);
        console.log(`🔍 Demand: Text any query for compressed answers`);
        console.log(`🗑️  Decay: ${DECAY_WINDOW_HOURS}h window | ${live.length} live items`);
        console.log(`💚 Health: GET /\n`);
    });
}

boot().catch(err => {
    console.error('[💀 BOOT FAILED]', err);
    process.exit(1);
});