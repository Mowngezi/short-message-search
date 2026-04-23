#!/usr/bin/env node
/**
 * Source SMS — Stress Test Harness
 *
 * Fires a suite of realistic SMS queries at the live /sms webhook,
 * measures latency + compression compliance, writes a CSV audit trail.
 *
 * Usage:
 *   BASE_URL=https://source-sms-production.up.railway.app node scripts/stress-test.js
 *   BASE_URL=http://localhost:4000 node scripts/stress-test.js   (local)
 *
 * Env:
 *   BASE_URL        — where to send the SMS webhooks (required)
 *   CONCURRENCY     — parallel requests per batch (default 5, judge-scale)
 *
 * Output:
 *   - Console summary: pass/fail counts, latency median/p95, overflow detection
 *   - CSV at scripts/results-<timestamp>.csv with per-query detail
 *
 * This script speaks Twilio's webhook format: POST application/x-www-form-urlencoded
 * with Body + From fields. The server replies with TwiML XML — we extract the
 * <Message> body to measure true SMS character count.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BASE_URL;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '5', 10);

if (!BASE_URL) {
    console.error('Error: BASE_URL env var is required.');
    console.error('  Example: BASE_URL=http://localhost:4000 node scripts/stress-test.js');
    process.exit(1);
}

// Stable fake phones — keep the Supabase user_profiles table tidy.
// Judges can run this without polluting the live profile list.
const PHONES = {
    judge_a: '+27711111111',
    judge_b: '+27722222222',
    judge_c: '+27733333333',
    vendor_a: '+27744444444',
    vendor_b: '+27755555555',
};

// --------------------------------------------------------------------------
// Query suite — spans all four routes + 11 SA languages + edge cases
// --------------------------------------------------------------------------
const SUITE = [
    // Help commands (route 0 — no API call, instant)
    { id: 'help_1',   route: 'help',     phone: PHONES.judge_a, body: 'help' },
    { id: 'help_2',   route: 'help',     phone: PHONES.judge_a, body: '?' },
    { id: 'help_3',   route: 'help',     phone: PHONES.judge_a, body: 'menu' },
    { id: 'help_4',   route: 'help',     phone: PHONES.judge_b, body: 'help vendor' },
    { id: 'help_5',   route: 'help',     phone: PHONES.judge_b, body: 'help search' },
    { id: 'help_6',   route: 'help',     phone: PHONES.judge_b, body: 'help home' },

    // Home Node registration (route 1)
    { id: 'home_1',   route: 'home',     phone: PHONES.judge_a, body: 'home Alex 3rdAve' },
    { id: 'home_2',   route: 'home',     phone: PHONES.judge_b, body: 'home Vosloorus Stand 45' },
    { id: 'home_3',   route: 'home',     phone: PHONES.vendor_a, body: 'home Alex LondonRd' },
    { id: 'home_4',   route: 'home',     phone: PHONES.vendor_b, body: 'home Alex FarRd' },

    // Supply updates (route 2) — 11 SA languages
    { id: 'sup_en',   route: 'supply',   phone: PHONES.vendor_a, body: 'Selling cement R95 per bag' },
    { id: 'sup_zu',   route: 'supply',   phone: PHONES.vendor_a, body: 'Ngidayisa inkukhu R35 quarter' },
    { id: 'sup_xh',   route: 'supply',   phone: PHONES.vendor_b, body: 'Ndithengisa inyama R50' },
    { id: 'sup_st',   route: 'supply',   phone: PHONES.vendor_b, body: 'Ke rekisa samente R95' },
    { id: 'sup_af',   route: 'supply',   phone: PHONES.vendor_a, body: 'Verkoop hoender R40' },
    { id: 'sup_ts',   route: 'supply',   phone: PHONES.vendor_a, body: 'Ndzi xavisa cement R95' },
    { id: 'sup_ve',   route: 'supply',   phone: PHONES.vendor_b, body: 'Ndi khou rengisa tshikeni R35' },
    { id: 'sup_got',  route: 'supply',   phone: PHONES.vendor_a, body: 'Got 50 bags Afrisam cement, R95' },
    { id: 'sup_have', route: 'supply',   phone: PHONES.vendor_b, body: 'Have fresh bread R18' },

    // Demand queries (route 3) — spanning languages + complexity
    { id: 'dem_en_simple',  route: 'demand', phone: PHONES.judge_a, body: 'cheapest cement near 3rd Ave?' },
    { id: 'dem_en_complex', route: 'demand', phone: PHONES.judge_a, body: 'cheapest cement 3rd Ave vs London Road, quality?' },
    { id: 'dem_en_grades',  route: 'demand', phone: PHONES.judge_b, body: 'cement 32.5N vs 42.5N which better?' },
    { id: 'dem_zu',         route: 'demand', phone: PHONES.judge_c, body: 'malini ugwayi wokubhema elokishini lase alex?' },
    { id: 'dem_xh',         route: 'demand', phone: PHONES.judge_c, body: 'kuphi inyama eshibhile eAlex?' },
    { id: 'dem_civic',      route: 'demand', phone: PHONES.judge_b, body: 'is Alex clinic open today?' },
    { id: 'dem_food',       route: 'demand', phone: PHONES.judge_a, body: 'where can I buy fresh bread near 3rd Ave?' },

    // Edge cases — stress the routing logic
    { id: 'edge_price_in_q',   route: 'demand', phone: PHONES.judge_a, body: 'is R50 fair for chicken?' },      // should be demand, not supply
    { id: 'edge_no_price_sup', route: 'demand', phone: PHONES.vendor_a, body: 'I am selling a bike' },          // "selling" but no price — demand-routed is correct
    { id: 'edge_mixed_lang',   route: 'demand', phone: PHONES.judge_c, body: 'where buy samente cheapest?' },   // Setho/English mix
    { id: 'edge_long',         route: 'demand', phone: PHONES.judge_a, body: 'I need to find cement and also chicken and maybe some airtime today in Alex near 3rd Ave or London Road, what is cheapest?' },
    { id: 'edge_empty',        route: 'demand', phone: PHONES.judge_a, body: '.' },
];

// --------------------------------------------------------------------------
// HTTP + measurement
// --------------------------------------------------------------------------

async function fireOne(q) {
    const form = new URLSearchParams({ From: q.phone, Body: q.body });
    const t0 = performance.now();
    let status = 0;
    let replyBody = '';
    let error = null;

    try {
        const res = await fetch(`${BASE_URL}/sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
        });
        status = res.status;
        const twiml = await res.text();
        // Extract the SMS body from <Message>...</Message>
        const match = twiml.match(/<Message>([\s\S]*?)<\/Message>/);
        replyBody = match ? decodeEntities(match[1]) : '';
    } catch (err) {
        error = err.message;
    }

    const latencyMs = Math.round(performance.now() - t0);
    const length = replyBody.length;

    return {
        id: q.id,
        route: q.route,
        phone: q.phone,
        body: q.body,
        status,
        latency_ms: latencyMs,
        reply_length: length,
        over_160: length > 160 ? 'YES' : 'no',
        reply: replyBody,
        error: error || '',
    };
}

function decodeEntities(s) {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// Bounded concurrency — don't DDOS a free-tier Railway box
async function runInBatches(items, size, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += size) {
        const slice = items.slice(i, i + size);
        process.stdout.write(`  batch ${i / size + 1}/${Math.ceil(items.length / size)}... `);
        const batch = await Promise.all(slice.map(fn));
        results.push(...batch);
        console.log(`done (${batch.length})`);
    }
    return results;
}

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function csvEscape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

(async () => {
    console.log(`\nSource SMS — stress test`);
    console.log(`target:       ${BASE_URL}`);
    console.log(`concurrency:  ${CONCURRENCY}`);
    console.log(`queries:      ${SUITE.length}\n`);

    const results = await runInBatches(SUITE, CONCURRENCY, fireOne);

    // Summary
    const ok = results.filter(r => r.status === 200 && !r.error);
    const failed = results.filter(r => r.status !== 200 || r.error);
    const overflowed = results.filter(r => r.reply_length > 160);
    const latencies = ok.map(r => r.latency_ms);

    console.log(`\n--- Summary ---`);
    console.log(`total:        ${results.length}`);
    console.log(`ok:           ${ok.length}`);
    console.log(`failed:       ${failed.length}`);
    console.log(`over-160:     ${overflowed.length}  ${overflowed.length ? '  ⚠️' : ''}`);
    if (latencies.length) {
        console.log(`latency p50:  ${percentile(latencies, 50)} ms`);
        console.log(`latency p95:  ${percentile(latencies, 95)} ms`);
        console.log(`latency max:  ${Math.max(...latencies)} ms`);
    }

    // Per-route breakdown
    console.log(`\n--- Per-route ---`);
    const routes = [...new Set(results.map(r => r.route))];
    for (const route of routes) {
        const r = results.filter(x => x.route === route);
        const ok = r.filter(x => x.status === 200 && !x.error).length;
        const over = r.filter(x => x.reply_length > 160).length;
        console.log(`${route.padEnd(8)}  ${ok}/${r.length} ok, ${over} over-160`);
    }

    // Failures + overflows in full
    if (failed.length || overflowed.length) {
        console.log(`\n--- Issues ---`);
        for (const r of [...failed, ...overflowed]) {
            console.log(`  [${r.id}] ${r.body.slice(0, 60)}`);
            if (r.error) console.log(`    error: ${r.error}`);
            if (r.reply_length > 160) console.log(`    over-160 (${r.reply_length}): ${r.reply.slice(0, 100)}...`);
            if (r.status && r.status !== 200) console.log(`    http ${r.status}`);
        }
    }

    // CSV
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const outDir = path.join(__dirname);
    const outPath = path.join(outDir, `results-${stamp}.csv`);
    const headers = ['id', 'route', 'phone', 'body', 'status', 'latency_ms', 'reply_length', 'over_160', 'reply', 'error'];
    const rows = [headers.join(',')].concat(
        results.map(r => headers.map(h => csvEscape(r[h])).join(','))
    );
    fs.writeFileSync(outPath, rows.join('\n'));
    console.log(`\nCSV: ${outPath}`);

    // Exit nonzero if anything's wrong — lets CI gate on it
    const hasIssues = failed.length > 0 || overflowed.length > 0;
    process.exit(hasIssues ? 1 : 0);
})();
