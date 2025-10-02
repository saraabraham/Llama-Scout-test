
import Groq from "groq-sdk";
import 'dotenv/config';

// Initialize the Groq client globally. It automatically uses the GROQ_API_KEY.
const groq = new Groq();

class BaseAgent {
    /**
     * @param {string} name - The name of the agent (e.g., 'Analyzer').
     * @param {string} instructions - The system instructions for the LLM.
     * @param {string} [model="meta-llama/llama-4-scout-17b-16e-instruct"] - The Groq model ID to use.
     */
    constructor(name, instructions, model = "meta-llama/llama-4-scout-17b-16e-instruct") {
        this.name = name;
        this.instructions = instructions;
        this.model = model;
        this.groqClient = groq; // Use the initialized client
    }

    async run(messages) {
        /** Default run method to be overridden by child classes */
        throw new Error("Subclasses must implement the run() method.");
    }

    /**
     * Queries the Groq API for text completion.
     * @param {string} prompt - The user prompt/data to send to the model.
     * @param {boolean} [enforceJson=false] - Whether to enforce JSON output via API setting.
     * @returns {Promise<string>} The raw text response from the model.
     */
    async _queryGroq(prompt, enforceJson = false) {
        console.log(`⚡️ ${this.name}: Querying Groq with model ${this.model}...`);
        try {
            const completion = await this.groqClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: this.instructions },
                    { role: "user", content: prompt },
                ],
                // Set temperature low for analysis/structured tasks
                temperature: 0.0,
                max_tokens: 4096,
                // The Llama 4 Scout supports structured output
                ...(enforceJson && { response_format: { type: "json_object" } }),
            });

            return completion.choices[0]?.message?.content || "";
        } catch (e) {
            console.error(`Error querying Groq: ${e.message}`);
            throw new Error(`API call failed: ${e.message}`);
        }
    }

    /**
     * Safely parses JSON from text, handling potential wrappers and errors.
     * @param {string} text - The raw text response from the LLM.
     * @returns {object} The parsed JSON object or an object containing an error.
     */
    _parseJsonSafely(text) {
        try {
            // 1. Check for markdown wrapper: ```json ... ``` or just ``` ... ```
            let jsonString = text.trim();
            if (jsonString.startsWith('```')) {
                const parts = jsonString.split(/```/g);
                jsonString = parts.length >= 2 ? parts[1].trim() : jsonString;
                // Remove 'json' prefix if present
                if (jsonString.toLowerCase().startsWith('json')) {
                    jsonString = jsonString.substring(4).trim();
                }
            }

            // 2. Try to find and parse content between the outermost curly braces
            const start = jsonString.indexOf("{");
            const end = jsonString.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                const contentToParse = jsonString.substring(start, end + 1);
                return JSON.parse(contentToParse);
            }

            // 3. Last resort: attempt to parse the trimmed text directly
            return JSON.parse(jsonString);

        } catch (e) {
            return { error: `Invalid JSON content: ${e.message}`, raw_text: text };
        }
    }
}

export default BaseAgent;