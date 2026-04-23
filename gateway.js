// ──────────────────────────────────────────────
// GATEWAY.JS — Local CLI simulator for supply/demand routing
// Run: node gateway.js [phone] [message]
// Examples:
//   node gateway.js 0825551234 "Cheapest cement near 3rd Ave?"
//   node gateway.js 0831112222 "Got 50 bags Afrisam cement, R95 each"
// ──────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const DB_PATH = './inventory.json';

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { inventory: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function processSMS(phoneNumber, message) {
    console.log(`\n[📥 INCOMING SMS] From: ${phoneNumber} | Message: "${message}"`);

    const db = readDB();
    const lowerMessage = message.toLowerCase();

    // ── THE SUPPLY ROUTE ──
    if (lowerMessage.startsWith('got') || lowerMessage.startsWith('update') || lowerMessage.startsWith('selling') || lowerMessage.startsWith('stock')) {
        console.log(`[⚡ ACTION] Supply intent detected. Extracting data...`);

        const newEntry = {
            vendorPhone: phoneNumber,
            raw_update: message,
            timestamp: new Date().toISOString(),
            geo_tag: "Alexandra_3rdAve"
        };

        db.inventory.push(newEntry);
        writeDB(db);

        console.log(`[💾 DATABASE] Saved to inventory.json`);
        console.log(`[📤 OUTGOING SMS] "Stock logged. You're now visible to local searches today."`);
        return;
    }

    // ── THE DEMAND ROUTE ──
    console.log(`[⚡ ACTION] Demand intent detected. Querying Claude with local context...`);

    const hasInventory = db.inventory && db.inventory.length > 0;
    const inventoryBlock = hasInventory
        ? `\nLOCAL DATABASE INVENTORY (Last 24 Hrs):\n${JSON.stringify(db.inventory)}\nIf there is a match, provide the price and location immediately.`
        : '';

    const systemPrompt = `You are an offline SMS routing agent for the township of Alexandra.
ABSOLUTE HARD LIMIT: You must keep your entire response under 140 characters.
Use abbreviations and remove all conversational filler.
Match the user's intent against the known local supply provided in the local database.
Understand isiZulu, isiXhosa, Setswana, Sesotho, Afrikaans, and township slang.
${inventoryBlock}`;

    const msg = await anthropic.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 50,
        system: systemPrompt,
        messages: [
            { role: "user", content: message }
        ]
    });

    const finalResponse = msg.content[0].text;
    console.log(`[🧠 CLAUDE REASONING COMPLETE]`);
    console.log(`[📤 OUTGOING SMS] "${finalResponse}"`);
    console.log(`[📏 CHAR COUNT] ${finalResponse.length}/160`);
}

// ── CLI ENTRY POINT ──
const args = process.argv.slice(2);
const simulatedPhone = args[0] || "0825551234";
const simulatedMessage = args[1] || "Cheapest cement near 3rd Ave?";

processSMS(simulatedPhone, simulatedMessage);