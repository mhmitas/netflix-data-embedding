// lib/embeddings.ts (CommonJS)

import { env, pipeline } from '@xenova/transformers';
import type { Pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

// --- IMPORTANT: Configure environment variables for Transformers.js ---
// By default, models download to a global cache. For Vercel/serverless, /tmp is best.
// For local script, default might be fine, but you can explicitly set it.
// env.localModelPath = '/tmp/transformers-cache'; // Example for Vercel /tmp directory
// env.cacheDir = '/tmp/.transformers-cache'; // For serverless environments like Vercel
// For a standalone local script, default cache location is usually fine,
// but if you have issues, uncomment and adjust these paths.


let extractor: FeatureExtractionPipeline | null = null; // Will store the loaded pipeline once initialized

// Interfaces for function parameters and return types
export interface EmbeddingResult {
    data: Float32Array | number[];
}

export interface EmbeddingModule {
    getEmbeddings(input: string | string[]): Promise<number[][]>;
    getEmbedding(text: string): Promise<number[]>;
    initializeEmbeddingModel(): Promise<void>;
}

/**
 * Loads the embedding model pipeline. This function is called only once.
 */
async function initializeEmbeddingModel() {
    if (!extractor) {
        console.log("Loading embedding model (Xenova/all-MiniLM-L6-v2)... This happens once.");
        // We recommend 'Xenova/all-MiniLM-L6-v2' for its small size (384 dimensions) and good performance.
        // It will download the model files (~60-70MB) the first time it's run.
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("Embedding model loaded.");
    }
}

/**
 * Generates embeddings for one or more text strings using a local open-source model.
 * @param {string|string[]} input The text (string or array of strings) to embed.
 * @returns {Promise<Array<Array<number>>>} A promise that resolves to an array of embedding vectors.
 */
async function getEmbeddings(input: string | string[]): Promise<Array<Array<number>>> {
    // If extractor is not initialized, load the model
    if (!extractor) {
        // Ensure the model is loaded before attempting to use it
        await initializeEmbeddingModel();
    }

    const texts = Array.isArray(input) ? input : [input];

    try {
        // 'pooling: mean' averages the embeddings of all tokens in a sentence.
        // 'normalize: true' scales the vectors to unit length, which is good for cosine similarity.
        const output = await extractor!(texts, { pooling: 'mean', normalize: true });

        // The output is an array of Tensors (one per input text). We need to convert them to plain number arrays.
        // If output.data is a single Tensor: Array.from(output.data)
        // If output is an array of Tensors: map over them
        if (Array.isArray(output)) {
            // Case where multiple inputs lead to multiple tensors
            return output.map(tensor => Array.from(tensor.data));
        } else {
            // Case where single input leads to single tensor
            return [Array.from(output.data)];
        }

    } catch (error) {
        console.error('Error generating embeddings with Transformers.js:', error);
        throw error;
    }
}

/**
 * Generates a single embedding for a text string.
 * @param {string} text The text to embed.
 * @returns {Promise<Array<number>>} A promise that resolves to a single embedding vector.
 */
async function getEmbedding(text: string): Promise<Array<number>> {
    const embeddings = await getEmbeddings(text);
    return embeddings[0];
}

// CommonJS export
export {
    getEmbeddings,
    getEmbedding,
    initializeEmbeddingModel
};