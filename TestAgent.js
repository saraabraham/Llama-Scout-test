// TestAgent.js

import BaseAgent from './BaseAgent.js';
import util from 'util';

class TestAgent extends BaseAgent {
    constructor() {
        super(
            "Tester",
            "You are a helpful and meticulous assistant. Your sole job is to answer the user's request and return the result strictly as a JSON object, following the provided schema. Do not include any extra text or conversational filler.",
            "meta-llama/llama-4-scout-17b-16e-instruct"
        );
    }

    // The run method is now implemented just for testing the base class methods.
    async run() {
        console.log("Starting BaseAgent test...");

        const testPrompt = `
        Please summarize the key benefits of using Groq's Llama 4 Scout model in three bullet points.
        
        Return a JSON object with the following structure:
        {
            "model_name": string,
            "benefits": ["benefit 1", "benefit 2", "benefit 3"],
            "test_status": "SUCCESS"
        }

        Wrap the JSON in markdown fences like this: \`\`\`json { ... } \`\`\`
        `;

        try {
            // 1. Call the core communication method
            const rawResponse = await this._queryGroq(testPrompt, true);

            console.log("\n--- Raw Response from Groq (Before Parsing) ---");
            console.log(rawResponse);

            // 2. Call the core data safety method
            const parsedResult = this._parseJsonSafely(rawResponse);

            console.log("\n--- Parsed JSON Result ---");
            // Use util.inspect for clean deep object printing in Node.js
            console.log(util.inspect(parsedResult, { depth: null, colors: true }));

            // 3. Final verification
            if (parsedResult.test_status === "SUCCESS" && parsedResult.benefits.length === 3) {
                console.log("\n✅ BaseAgent Test: SUCCESS. Connection and parsing verified.");
                return parsedResult;
            } else if (parsedResult.error) {
                console.log(`\n❌ BaseAgent Test: FAILURE. Parsing Error: ${parsedResult.error}`);
            } else {
                console.log("\n❌ BaseAgent Test: FAILURE. Output structure was incorrect.");
            }

            return parsedResult;

        } catch (error) {
            console.log(`\n❌ BaseAgent Test: FATAL FAILURE. API connection failed. Error: ${error.message}`);
            return { error: `Fatal API Error: ${error.message}` };
        }
    }
}

// Execute the test
const agent = new TestAgent();
agent.run();