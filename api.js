import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
// --- ES Module Environment Setup ---
// These lines are necessary to replicate __dirname in ES Modules (Node v14+)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End ES Module Fixes ---

// Import your ExtractorAgent
import ExtractorAgent from './ExtractorAgent.js';

const app = express();
const PORT = 3001;

// --- Multer Setup for File Uploads ---
// We'll store files in a temporary 'uploads' directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use the corrected __dirname for robust pathing
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use a timestamp and replace spaces for safer filenames
        cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    }
});
const upload = multer({ storage: storage });
// ------------------------------------

// Middleware
app.use(cors());
// Use built-in Express parser. bodyParser.json() is commented out and not needed.
app.use(express.json());

const extractor = new ExtractorAgent();

// --- API Endpoint ---
app.post('/analyze', upload.single('resumeFile'), async (req, res) => {
    // 1. Check if a file was successfully uploaded
    if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded. Please upload a resume." });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;

    // 2. Prepare the input for the ExtractorAgent
    const mockMessages = [
        { role: "system", content: "Frontend initiated file analysis." },
        {
            role: "user",
            // Pass the file path to the agent
            content: JSON.stringify({ file_path: filePath })
        }
    ];

    try {
        // 3. Run the ExtractorAgent (which uses Groq/Llama 4 Scout)
        console.log(`🔍 Analyzing file: ${fileName}`);
        const result = await extractor.run(mockMessages);

        // 4. Send the result back to the client
        if (result.error) {
            // Consider 422 Unprocessable Entity if the file content itself was the issue
            const statusCode = (result.error.includes("File processing failed") || result.error.includes("Invalid content")) ? 422 : 500;
            return res.status(statusCode).json({
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
        console.error("❌ Agent execution failed:", error.message);
        res.status(500).json({
            status: "error",
            message: "Internal server error during agent execution.",
            error: error.message
        });
    } finally {
        // 5. CRITICAL: Delete the temporary file after processing
        fs.unlink(filePath, (err) => {
            if (err) console.error(`⚠️ Failed to delete temporary file ${fileName}:`, err);
            else console.log(`🗑️ Cleaned up temporary file: ${fileName}`);
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log("   Ready to accept file uploads at /analyze.");
});