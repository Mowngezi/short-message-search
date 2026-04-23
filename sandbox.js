// ──────────────────────────────────────────────
// SANDBOX.JS — Interactive Extended Thinking Tester
// Run: node sandbox.js
// Type any SMS query, see Claude's THINKING + compressed response.
// This is the demo tool — shows judges how Opus 4.7 reasons
// before compressing into 140 chars.
// ──────────────────────────────────────────────

require('dotenv').config();
const readline = require('readline');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function testPrompt(userQuery) {
    try {
        const msg = await anthropic.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 16000,
            // ── EXTENDED THINKING ──
            // Opus 4.7 reasons internally about HOW to compress
            // the answer before generating the final SMS response.
            thinking: {
                type: "adaptive"
            },
            output_config: {
                effort: "high"
            },
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userQuery }],
        });

        // Extract thinking and text blocks
        const thinkingBlock = msg.content.find(block => block.type === 'thinking');
        const textBlock = msg.content.find(block => block.type === 'text');

        // Show Claude's internal reasoning (the magic)
        if (thinkingBlock) {
            console.log(`\n┌─── 💭 EXTENDED THINKING ───────────────────────┐`);
            console.log(thinkingBlock.thinking);
            console.log(`└────────────────────────────────────────────────┘`);
        }

        const output = textBlock ? textBlock.text : "No response generated.";
        console.log(`\n[🟢 SMS Response] Length: ${output.length}/160`);
        console.log(`> ${output}\n`);
    } catch (error) {
        console.error('\n[❌ Error]', error.message, '\n');
    }
}

console.log(`\n🔥 Source-SMS Sandbox (Extended Thinking Mode)`);
console.log(`💭 You'll see Claude's internal reasoning before the compressed response.`);
console.log(`📏 Target: 140 chars internal → fits 160 char SMS limit`);
console.log(`Type your SMS query and press Enter. (Type 'exit' to quit)\n`);

rl.on('line', async (input) => {
    if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
    }
    console.log(`[🧠 Thinking...]`);
    await testPrompt(input);
});