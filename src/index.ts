import 'dotenv/config';

import express, { Request, Response } from 'express';
import { getEmbeddings, initializeEmbeddingModel } from "./lib/embedding.js";
import { sql } from "./lib/db.js";
import { markdownContent } from "./lib/constants.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Middleware to parse JSON request bodies
app.use(express.json());

app.get('/', (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/markdown');
    res.send(markdownContent); // assume markdownContent is defined
});

// --- Health Check Endpoint ---
app.get('/health', async (req: express.Request, res: express.Response) => {
    try {
        await sql('SELECT 1;');
        res.status(200).send('OK (Database connected)');
    } catch (error) {
        console.error('Health check failed - DB error:', error);
        res.status(500).send('Error (Database connection failed)');
    }
});

// --- Embedding Endpoint ---
app.post('/embed-query', async (req: Request, res: Response) => {
    const { texts } = req.body as { texts?: unknown };

    if (!Array.isArray(texts) || texts.length === 0) {
        res.status(400).json({ error: 'Invalid input: "texts" must be a non-empty array.' });
        return;
    }

    if (!texts.every(t => typeof t === 'string')) {
        res.status(400).json({ error: 'Invalid input: all elements in "texts" must be strings.' });
        return;
    }

    try {
        const stringTexts = texts as string[];
        const embeddings = await getEmbeddings(stringTexts);

        res.status(200).json({
            input_texts: stringTexts,
            model: 'Xenova/all-MiniLM-L6-v2',
            timestamp: new Date().toISOString(),
            embeddings
        });
    } catch (error) {
        console.error('Error in /embed-query endpoint:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to generate embeddings.', details: message });
    }
});

// --- Server Startup ---
async function startServer() {
    try {
        await initializeEmbeddingModel();
        console.log('Embedding model initialized successfully.');

        app.listen(PORT, () => {
            console.log(`Embedding API server running on port ${PORT}`);
            console.log(`Access health check at http://localhost:${PORT}/health`);
            console.log(`Send POST requests to http://localhost:${PORT}/embed-query`);
        });
    } catch (error) {
        console.error('Failed to start server due to embedding model initialization error:', error);
        process.exit(1);
    }
}

// Start the server
startServer();