import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
// Import your ExtractorAgent
import ExtractorAgent from './ExtractorAgent.js';

const app = express();
const PORT = 3001; // Choose a port different from React's default (3000)

// Middleware
app.use(cors()); // Allows the React frontend to talk to this server
app.use(bodyParser.json({ limit: '5mb' })); // Increased limit for potential resume text

const extractor = new ExtractorAgent();

// --- API Endpoint ---
app.post('/analyze', async (req, res) => {
    const { resumeText } = req.body;

    if (!resumeText) {
        return res.status(400).json({ error: "Missing resumeText in request body." });
    }

    // 1. Prepare the input for the ExtractorAgent
    const mockMessages = [
        { role: "system", content: "Frontend initiated analysis." },
        {
            role: "user",
            content: JSON.stringify({
                text: resumeText,
                // file_path: "path/to/upload" // PDF uploads are complex, focusing on text for chat-like interface
            })
        }
    ];

    try {
        // 2. Run the ExtractorAgent (which uses Groq/Llama 4 Scout)
        const result = await extractor.run(mockMessages);

        // 3. Send the result back to the React frontend
        if (result.error) {
            return res.status(500).json({
                status: "failed",
                message: result.error,
                data: null
            });
        }

        res.json({
            status: "success",
            data: result.structured_data
        });

    } catch (error) {
        console.error("Agent execution failed:", error.message);
        res.status(500).json({
            status: "error",
            message: "Internal server error during agent execution.",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log("   Ready to accept /analyze requests.");
});