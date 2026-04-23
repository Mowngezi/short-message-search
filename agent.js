require('dotenv').config();
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
   apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are the Source-SMS routing and compression engine. 
Your objective is to answer the user's query with maximum factual density.
You serve users on feature phones in South Africa, primarily in township economies (e.g., Alexandra, Khayelitsha).

CRITICAL CONSTRAINTS:
1. HARD LIMIT: Your final response MUST be 160 characters or less. No exceptions.
2. ZERO FLUFF: Do not say "Here is the information" or "Hello". Start immediately with the data.
3. COMPRESSION: Use accepted abbreviations (e.g., max, min, JHB, PTA, mins, R for Rand). 
4. LOCAL CONTEXT: Understand local slang and spatial geography (e.g., "Alex" means Alexandra).
5. FORMATTING: Use raw text. No markdown, no bolding, no asterisks.

If the query is conversational, ignore the pleasantries and answer the implicit question.`;

async function runCompressionRoutine(userQuery) {
    console.log(`[🧠 Agent Started] Analyzing: "${userQuery}"`);
    
    try {
        const msg = await anthropic.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 100,
            system: SYSTEM_PROMPT,
            messages: [
                { role: "user", content: userQuery }
            ],
        });

        // These are the lines that got deleted!
        const output = msg.content[0].text;
        const charCount = output.length;
        
        console.log(`[🟢 Agent Finished] Length: ${charCount}/160`);
        console.log(`Output: ${output}`);
        
        return output;
        
    } catch (error) {
        console.error('[❌ Agent Error]', error);
        return "Error: System busy. Try again.";
    }
}

// Local Test Run (Delete or comment this out later)
runCompressionRoutine("hi please can you tell me what the cheapest chicken combo is near alexandra today?");