// ExtractorAgent.js

import BaseAgent from './BaseAgent.js';
import fs from 'fs';
import PDFParser from 'pdf2json'; // <-- NEW: Import the pdf2json library

class ExtractorAgent extends BaseAgent {
    constructor() {
        super(
            "Extractor",
            `You are a highly detail-oriented Data Extractor. Your task is to extract all significant data from the provided resume text, which may be in a language like Swedish. You must **TRANSLATE ALL TEXTUAL CONTENT** (summary, descriptions, degrees) into **ENGLISH** and transform it into a single, comprehensive JSON object. You must strictly adhere to the requested JSON structure and provide ONLY the JSON object.`,
            "meta-llama/llama-4-scout-17b-16e-instruct"
        );
    }

    /**
     * Helper function to extract text from a local PDF file using pdf2json.
     * This uses a Promise wrapper to convert the event-based pdf2json into an async function.
     * @param {string} filePath - Path to the PDF file.
     * @returns {Promise<string>} The raw text content extracted from the PDF.
     */
    async _extractTextFromPdf(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at path: ${filePath}`);
        }

        return new Promise((resolve, reject) => {
            // Instantiate the PDFParser
            const pdfParser = new PDFParser(this, 1); // The '1' prevents console output

            // Success listener: Fires when text extraction is complete
            pdfParser.on("pdfParser_dataReady", pdfData => {
                // pdf2json output is in JSON format, containing page data
                let fullText = "";
                pdfData.Pages.forEach(page => {
                    page.Texts.forEach(text => {
                        // Decode the text and replace spaces
                        fullText += decodeURIComponent(text.R[0].T) + ' ';
                    });
                });
                // Simple cleanup to combine the text blocks
                resolve(fullText.replace(/(\s\s+|\n)/g, ' ').trim());
            });

            // Error listener: Fires on any parsing error
            pdfParser.on("pdfParser_dataError", errData => {
                reject(new Error(`PDF parsing error: ${errData.data}`));
            });

            // Start parsing the file
            pdfParser.loadPDF(filePath);
        });
    }

    /**
     * The main execution method for the agent.
     */
    async run(messages) {
        console.log("📄 Extractor: Processing resume");

        let inputData;
        try {
            inputData = JSON.parse(messages.at(-1)?.content || '{}');
        } catch (e) {
            console.error("Error: Input message content is not valid JSON.");
            return { error: "Invalid input format to ExtractorAgent" };
        }

        let rawText = "";

        if (inputData.text) {
            rawText = inputData.text;
            console.log("✅ Using text directly from input message.");
        } else if (inputData.file_path) {
            try {
                console.log(`⏳ Extracting text from PDF: ${inputData.file_path}`);
                rawText = await this._extractTextFromPdf(inputData.file_path);
                console.log("✅ PDF extraction complete.");
            } catch (e) {
                console.error(`❌ PDF Extraction failed: ${e.message}`);
                return { error: `PDF Extraction failed: ${e.message}` };
            }
        } else {
            rawText = "No valid resume text or file path provided.";
            console.error("❌ No text or file path provided.");
        }


        // 3. Define the extraction prompt and target structure
        const extractionPrompt = `
        Transform the following raw resume text into a single JSON object.

        Your JSON object must contain these keys:
        {
            "personal_info": { "name": "...", "email": "...", "phone": "..." },
            "summary": "...",
            "work_experience": [
                { "title": "...", "company": "...", "duration": "...", "description": "..." }
            ],
            "education": [
                { "degree": "...", "institution": "...", "year": "..." }
            ],
            "technical_skills": ["skill1", "skill2"],
            "certifications": ["cert1", "cert2"]
        }

        Raw Resume Text:
        ---
        ${rawText}
        ---

        Return ONLY the JSON object.
        `;

        let extractedInfo;

        try {
            // 4. Query Groq, enforcing JSON output
            const extractedInfoRaw = await this._queryGroq(extractionPrompt, true);
            extractedInfo = this._parseJsonSafely(extractedInfoRaw);
        } catch (apiError) {
            console.error(`Extractor Agent failed due to Groq API error: ${apiError.message}`);
            extractedInfo = { error: `API Failure: ${apiError.message}` };
        }

        // 5. Handle Parsing Errors
        if ("error" in extractedInfo) {
            console.error(`Warning: JSON parsing failed. Error: ${extractedInfo.error}`);
            return {
                "raw_text": rawText,
                "structured_data": extractedInfo,
                "extraction_status": "failed",
                "confidence_score": 0.2
            };
        }

        // 6. Return structured output
        return {
            "raw_text": rawText,
            "structured_data": extractedInfo,
            "extraction_status": "completed",
            "confidence_score": 0.95
        };
    }
}

// // --- Example Usage ---
// async function main() {
//     // Requires a file named test_resume.pdf in your project root.
//     const mockMessages = [
//         {
//             role: "user",
//             content: JSON.stringify({
//                 file_path: "test_resume.pdf"
//             })
//         }
//     ];

//     const agent = new ExtractorAgent();
//     const result = await agent.run(mockMessages);

//     if (result.error) {
//         console.log("\n--- Extractor Agent FAILED ---");
//         console.log(result.error);
//         return;
//     }

//     console.log("\n--- Extractor Agent Output (Structured Data) ---");
//     console.log(JSON.stringify(result.structured_data, null, 2));
//     console.log(`\nStatus: ${result.extraction_status}`);
// }

// main();
export default ExtractorAgent; 