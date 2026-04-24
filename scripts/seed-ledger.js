#!/usr/bin/env node
/**
 * Source SMS — Reference Market Seed
 *
 * Inserts a set of MARKET BASELINE entries into inventory_ledger so the
 * system has plausible pricing intelligence out of the box — cement,
 * chicken, bread, vetkoek, paraffin, airtime, kombi fare, etc.
 *
 * Provenance rule: every seed row uses vendor_phone = "+27000000000".
 * The server's system prompt teaches Claude that this sentinel means
 * "market baseline, not a live vendor." Real vendor entries always win
 * when both exist. Judges reading the DB can see at a glance which
 * entries are reference and which are vendor-submitted.
 *
 * Idempotent: wipes all existing +27000000000 rows, then inserts fresh.
 * Re-run anytime to reset the baseline cleanly.
 *
 * Usage:
 *   node scripts/seed-ledger.js
 *
 * Env (reads from .env via dotenv):
 *   SUPABASE_URL
 *   SUPABASE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sentinel phone number for system-contributed reference entries.
// Must match the value the server's system prompt checks for.
const REFERENCE_PHONE = '+27000000000';

// --------------------------------------------------------------------------
// Reference entries — the township staples that would actually get searched.
// Geo_tags mirror how a real vendor would describe their spot: suburb + street
// or suburb + landmark. Times are staggered across the decay window so the
// rebuilt inventory shows a realistic mix of fresh (<6h) and aging (<24h).
// --------------------------------------------------------------------------
const MINUTES_AGO = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

const SEEDS = [
    // Construction — highest-value township commodity
    { raw_update: 'Afrisam cement 50kg R95 per bag (market baseline)',      geo_tag: 'Alex 3rd Ave near Pan Africa mall',     minutes_ago: 45  },
    { raw_update: 'PPC cement 50kg R92 per bag (market baseline)',          geo_tag: 'Alex London Rd',                         minutes_ago: 180 },
    { raw_update: 'River sand 1 bakkie load R350 (market baseline)',        geo_tag: 'Alex Extension 8',                       minutes_ago: 600 },

    // Food staples — daily township purchases
    { raw_update: 'Chicken quarter R35, half R65, whole R120 (baseline)',   geo_tag: 'Alex 17th Ave near taxi rank',           minutes_ago: 30  },
    { raw_update: 'Fresh white bread R18, brown R17 (baseline)',            geo_tag: 'Alex 4th Ave spaza row',                 minutes_ago: 90  },
    { raw_update: 'Vetkoek R8 each, with mince R18 (baseline)',             geo_tag: 'Alex 12th Ave mama shop strip',          minutes_ago: 20  },
    { raw_update: 'Iwisa mealie meal 10kg R120, Ace 10kg R115 (baseline)',  geo_tag: 'Khayelitsha Site B main rd',             minutes_ago: 240 },
    { raw_update: 'Eggs tray of 30 R80, half tray R42 (baseline)',          geo_tag: 'Khayelitsha Site C',                     minutes_ago: 420 },
    { raw_update: 'Tomato + onion pack R20, sometimes R25 (baseline)',      geo_tag: 'Alex 6th Ave veg stalls',                minutes_ago: 150 },
    { raw_update: 'Cooking oil 750ml R45, 2L R110 (baseline)',              geo_tag: 'Soweto Orlando East',                    minutes_ago: 900 },
    { raw_update: 'Sugar 2.5kg R55, white or brown (baseline)',             geo_tag: 'Alex 3rd Ave spaza cluster',             minutes_ago: 720 },

    // Household essentials
    { raw_update: 'Paraffin 1L R25 for lamps and stoves (baseline)',        geo_tag: 'Khayelitsha Site B',                     minutes_ago: 360 },
    { raw_update: 'Candles pack of 6 R15, loose R3 each (baseline)',        geo_tag: 'Alex 8th Ave',                           minutes_ago: 540 },
    { raw_update: 'Sunlight soap green bar R15 (baseline)',                 geo_tag: 'Alex 4th Ave',                           minutes_ago: 1080 },

    // Connectivity — critical for Source\'s own audience
    { raw_update: 'Airtime: R5 R10 R20 R29 vouchers, all networks (baseline)', geo_tag: 'Alex every corner spaza',             minutes_ago: 15  },
    { raw_update: 'Data 1GB R79 MTN, R85 Vodacom weekly (baseline)',        geo_tag: 'Alex Pan Africa mall area',              minutes_ago: 300 },

    // Transport — the other daily expense
    { raw_update: 'Kombi Alex-Sandton R12, Alex-JHB city R15 (baseline)',   geo_tag: 'Alex taxi rank',                         minutes_ago: 60  },
    { raw_update: 'Bakkie Khayelitsha-Cape Town centre R25 (baseline)',     geo_tag: 'Khayelitsha Site C taxi rank',           minutes_ago: 480 },
];

// --------------------------------------------------------------------------
// Seeder
// --------------------------------------------------------------------------

async function wipePriorSeeds() {
    const { error, count } = await supabase
        .from('inventory_ledger')
        .delete({ count: 'exact' })
        .eq('vendor_phone', REFERENCE_PHONE);

    if (error) {
        console.error('[❌ Wipe Error]', error.message);
        throw error;
    }
    console.log(`[🗑️  WIPED] ${count ?? 0} prior reference rows`);
}

async function insertSeeds() {
    const rows = SEEDS.map(seed => ({
        vendor_phone: REFERENCE_PHONE,
        raw_update: seed.raw_update,
        geo_tag: seed.geo_tag,
        created_at: MINUTES_AGO(seed.minutes_ago),
    }));

    const { error, data } = await supabase
        .from('inventory_ledger')
        .insert(rows)
        .select('id');

    if (error) {
        console.error('[❌ Insert Error]', error.message);
        throw error;
    }
    console.log(`[🌱 SEEDED] ${data.length} reference rows`);
    return data.length;
}

function summarise() {
    // Helpful one-line breakdown by category
    const byGeo = SEEDS.reduce((acc, s) => {
        const area = s.geo_tag.split(' ')[0];
        acc[area] = (acc[area] || 0) + 1;
        return acc;
    }, {});
    console.log(`\nCoverage:`);
    for (const [area, count] of Object.entries(byGeo)) {
        console.log(`  ${area.padEnd(14)}  ${count} entries`);
    }

    const ageBuckets = { fresh: 0, aging: 0 };
    for (const s of SEEDS) {
        const hoursAgo = s.minutes_ago / 60;
        if (hoursAgo < 6) ageBuckets.fresh += 1;
        else ageBuckets.aging += 1;
    }
    console.log(`  fresh (<6h):  ${ageBuckets.fresh}`);
    console.log(`  aging (<24h): ${ageBuckets.aging}`);
}

(async () => {
    console.log(`\nSource SMS — seed ledger\n`);
    console.log(`target:    ${SUPABASE_URL}`);
    console.log(`sentinel:  ${REFERENCE_PHONE} (market baseline phone)`);
    console.log(`entries:   ${SEEDS.length}\n`);

    try {
        await wipePriorSeeds();
        const inserted = await insertSeeds();
        summarise();
        console.log(`\n✅ Done. Restart the server to rehydrate inventory.json from ledger.\n`);
        process.exit(inserted > 0 ? 0 : 1);
    } catch (err) {
        console.error('\n❌ Seed failed:', err.message);
        process.exit(1);
    }
})();
