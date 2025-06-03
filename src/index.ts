import 'dotenv/config';
import express from 'express';
import { sql } from "./lib/db.js";
import { getEmbedding, getEmbeddings, initializeEmbeddingModel } from "./lib/embedding.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (_req, res) => {
    res.send('Hello from Express + TypeScript + ESModules!');
});

app.get('/api/embed-query', async (_req, res) => {
    try {
        const queryText = _req.query.text as string;
        if (!queryText?.trim() || queryText.trim().length < 3) {
            res.status(400).send("Query text is required. and minimum length is 3 characters.");
            return;
        }
        const embeddedQuery = await getEmbedding(queryText);
        res
            .send({
                text: queryText,
                vector: embeddedQuery
            })
            .status(200);
    } catch (error) {
        console.error("Error during embedding population:", error);
        res.status(500).send("Failed to start embedding population. Check server logs for details.");
    }
});


// const BATCH_SIZE = 50;
// const RETRY_DELAY_MS = 1000; // Can be reduced from 20s as no rate limit now
// const MAX_RETRIES = 5;       // Retries for local processing issues, not API limits

// async function populateEmbeddings() {
//     console.log("Starting embedding population script...");

//     // --- Initialize the embedding model ---
//     try {
//         await initializeEmbeddingModel();
//     } catch (modelError) {
//         console.error("Failed to load the embedding model:", modelError);
//         process.exit(1);
//     }

//     // --- Verify database connection ---
//     try {
//         await sql('SELECT 1;');
//         console.log("Database connection successful.");
//     } catch (dbErr) {
//         console.error("Failed to connect to the database. Please check your DATABASE_URL.", dbErr);
//         process.exit(1);
//     }

//     let lastProcessedId = 0;
//     let processedCount = 0;
//     let batchNum = 0;

//     while (true) {
//         batchNum++;
//         console.log(`\n--- Processing Batch ${batchNum} (last ID: ${lastProcessedId}) ---`);

//         let moviesToProcess;
//         try {
//             moviesToProcess = await sql(
//                 `SELECT show_id, title, description, listed_in
//                 FROM netflix_shows
//                 WHERE embedding_vector IS NULL
//                 AND show_id > $1
//                 ORDER BY show_id ASC
//                 LIMIT $2;`,
//                 [lastProcessedId, BATCH_SIZE]
//             );
//         } catch (dbErr) {
//             console.error(`ERROR fetching movies for batch ${batchNum}:`, dbErr);
//             break;
//         }

//         // Exit condition: no more records
//         if (moviesToProcess.length === 0) {
//             console.log("No more movies without embeddings found. Script finished.");
//             break;
//         }

//         // Update cursor immediately to prevent infinite loops on errors
//         lastProcessedId = moviesToProcess[moviesToProcess.length - 1].show_id;

//         // Prepare texts for embedding
//         const textsToEmbed = moviesToProcess.map(movie => {
//             const parts = [];
//             if (movie.title) parts.push(`Title: ${movie.title}`);
//             if (movie.description) parts.push(`Description: ${movie.description}`);
//             if (movie.listed_in) parts.push(`Genres: ${movie.listed_in}`);
//             return parts.join(". ");
//         });

//         // Generate embeddings with retries
//         let embeddings = null;
//         let retries = 0;
//         while (retries < MAX_RETRIES) {
//             try {
//                 console.log(`Generating ${textsToEmbed.length} embeddings locally...`);
//                 embeddings = await getEmbeddings(textsToEmbed);
//                 console.log(`Generated ${embeddings.length} embeddings.`);
//                 break;
//             } catch (error) {
//                 retries++;
//                 console.error(`Attempt ${retries}/${MAX_RETRIES} failed:`, error);
//                 if (retries < MAX_RETRIES) {
//                     console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
//                     await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
//                 } else {
//                     console.error(`Max retries reached. Skipping batch ${batchNum}.`);
//                     embeddings = null;
//                     break;
//                 }
//             }
//         }

//         // Skip batch if embeddings failed
//         if (!embeddings || embeddings.length !== moviesToProcess.length) {
//             console.warn(`Skipping batch ${batchNum} due to embedding generation failure.`);
//             continue;
//         }

//         // Update database
//         console.log(`Updating database for ${embeddings.length} movies...`);
//         const updatePromises = moviesToProcess.map((movie, index) => {
//             const embedding = embeddings[index];
//             const vectorString = '[' + embedding.join(',') + ']';

//             return sql(
//                 `UPDATE netflix_shows
//                 SET embedding_vector = $1
//                 WHERE show_id = $2;`,
//                 [vectorString, movie.show_id]
//             );
//         });

//         try {
//             await Promise.all(updatePromises);
//             processedCount += embeddings.length;
//             console.log(`Successfully updated ${embeddings.length} movies. Total processed: ${processedCount}`);
//         } catch (dbError) {
//             console.error(`ERROR updating batch ${batchNum}:`, dbError);
//         }

//         // Optional: Add small delay between batches
//         if (BATCH_SIZE > 100) {
//             await new Promise(resolve => setTimeout(resolve, 100));
//         }
//     }

//     console.log(`\nScript finished. Total movies processed: ${processedCount}`);
//     process.exit(0);
// }

// populateEmbeddings().catch(error => {
//     console.error("Script terminated with an unhandled error:", error);
//     process.exit(1);
// });

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
