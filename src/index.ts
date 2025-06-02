import 'dotenv/config';
import express from 'express';
import { getEmbeddings, initializeEmbeddingModel } from "./lib/embedding";

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (_req, res) => {
    res.send('Hello from Express + TypeScript + ESModules!');
});

const BATCH_SIZE = 50;
const RETRY_DELAY_MS = 1000; // Can be reduced from 20s as no rate limit now
const MAX_RETRIES = 5;       // Retries for local processing issues, not API limits

async function populateEmbeddings() {
    console.log("Starting embedding population script...");

    // --- Initialize the embedding model once at the start ---
    try {
        await initializeEmbeddingModel();
    } catch (modelError) {
        console.error("Failed to load the embedding model:", modelError);
        process.exit(1);
    }

    let offset = 0;
    let hasMore = true;
    let processedCount = 0;
    let batchNum = 0;

    try {
        await sql('SELECT 1;');
        console.log("Database connection successful.");
    } catch (dbErr) {
        console.error("Failed to connect to the database. Please check your DATABASE_URL.", dbErr);
        process.exit(1);
    }

    while (hasMore) {
        batchNum++;
        console.log(`\n--- Processing Batch ${batchNum} (offset: ${offset}) ---`);

        let moviesToProcess;
        try {
            moviesToProcess = await sql(
                `SELECT show_id, title, description, listed_in
                FROM netflix_shows
                WHERE embedding_vector IS NULL
                ORDER BY show_id ASC
                OFFSET $1
                LIMIT $2;`,
                [offset, BATCH_SIZE]
            );
        } catch (dbErr) {
            console.error(`ERROR fetching movies for batch ${batchNum}:`, dbErr);
            break;
        }

        if (moviesToProcess.length === 0) {
            hasMore = false;
            console.log("No more movies without embeddings found. Script finished.");
            break;
        }

        const textsToEmbed = moviesToProcess.map(movie => {
            const parts = [];
            if (movie.title) parts.push(`Title: ${movie.title}`);
            if (movie.description) parts.push(`Description: ${movie.description}`);
            if (movie.listed_in) parts.push(`Genres: ${movie.listed_in}`);
            return parts.join(". ");
        });

        let embeddings = null;
        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                console.log(`Generating ${textsToEmbed.length} embeddings locally...`);
                embeddings = await getEmbeddings(textsToEmbed); // --- CALL THE NEW FUNCTION ---
                console.log(`Generated ${embeddings.length} embeddings.`);
                break;
            } catch (error) {
                retries++;
                console.error(`Attempt ${retries}/${MAX_RETRIES} failed to generate embeddings for batch ${batchNum}:`, error);
                if (retries < MAX_RETRIES) {
                    console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                } else {
                    console.error(`Max retries reached for batch ${batchNum}. Skipping this batch.`);
                    embeddings = null;
                    break;
                }
            }
        }

        if (!embeddings || embeddings.length === 0) {
            console.warn(`Skipping batch ${batchNum} due to embedding generation failure.`);
            offset += BATCH_SIZE;
            continue;
        }

        console.log(`Updating database for ${embeddings.length} movies...`);
        const updatePromises = moviesToProcess.map((movie, index) => {
            const embedding = embeddings[index];
            const vectorString = '[' + embedding.join(',') + ']'; // Keep this format for pgvector

            return sql(
                `UPDATE netflix_shows
                SET embedding_vector = $1
                WHERE show_id = $2;`,
                [vectorString, movie.show_id]
            );
        });

        try {
            await Promise.all(updatePromises);
            console.log(`Successfully updated ${embeddings.length} movies in batch ${batchNum}.`);
            processedCount += embeddings.length;
        } catch (dbError) {
            console.error(`ERROR updating database for batch ${batchNum}:`, dbError);
        }

        offset += BATCH_SIZE;
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between batches
    }

    console.log(`\nScript finished. Total movies processed: ${processedCount}`);
    process.exit(0);
}

populateEmbeddings().catch(error => {
    console.error("Script terminated with an unhandled error:", error);
    process.exit(1);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
