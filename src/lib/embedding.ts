// lib/embeddings.ts (CommonJS - Minor TS Type Refinements)

import { pipeline, env, PipelineType } from '@xenova/transformers'

// Declare types for the imported functions to help TypeScript understand.
// Now using PipelineType for the 'task' parameter
interface TransformersPipeline {
    (task: 'feature-extraction', model?: string, options?: any): Promise<any>;
    // Note: 'feature-extraction' string literal is also valid directly.
    // Using typeof PipelineType.FEATURE_EXTRACTION makes it explicitly type-checked.
}

const typedPipeline: TransformersPipeline = pipeline;
// const typedEnv: TransformersEnv = env; // Not directly used after initial import, so optional.

let extractor: any = null;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;

async function initializeEmbeddingModel(): Promise<void> {
    if (!extractor) {
        console.log(`Loading embedding model (${MODEL_NAME})... This happens once.`);
        // Use the specific 'feature-extraction' string literal for the task
        extractor = await typedPipeline('feature-extraction', MODEL_NAME);
        console.log("Embedding model loaded.");
    }
}

async function getEmbeddings(input: string | string[]): Promise<number[][]> {
    if (!extractor) {
        await initializeEmbeddingModel();
    }

    const texts = Array.isArray(input) ? input : [input];

    try {
        const output: any = await extractor(texts, { pooling: 'mean', normalize: true });

        if (Array.isArray(output)) {
            if (output.length !== texts.length) {
                console.warn(`WARN: Sent ${texts.length} texts, but model returned ${output.length} embeddings.`);
            }
            return output.map((tensorItem: { data: Float32Array }) => Array.from(tensorItem.data));
        }
        else if (output && typeof output.data !== 'undefined') {
            const dataArray: Float32Array = output.data;

            if (texts.length === 1) {
                return [Array.from(dataArray)];
            } else {
                if (dataArray.length === texts.length * EMBEDDING_DIMENSION) {
                    console.warn(`WARN: Extractor returned a single flattened tensor for ${texts.length} inputs. Reshaping.`);
                    const reshapedEmbeddings: number[][] = [];
                    for (let i = 0; i < texts.length; i++) {
                        const start = i * EMBEDDING_DIMENSION;
                        const end = start + EMBEDDING_DIMENSION;
                        reshapedEmbeddings.push(Array.from(dataArray.slice(start, end)));
                    }
                    return reshapedEmbeddings;
                } else {
                    throw new Error(
                        `Unexpected single tensor output for batch. Expected total data length ${texts.length * EMBEDDING_DIMENSION}, got ${dataArray.length}.`
                    );
                }
            }
        }
        else {
            throw new Error('Unexpected output format from embeddings model: neither array of tensors nor single tensor with data.');
        }

    } catch (error) {
        console.error('Error generating embeddings with Transformers.js:', error);
        throw error;
    }
}

async function getEmbedding(text: string): Promise<number[]> {
    const embeddings = await getEmbeddings(text);
    return embeddings[0];
}


export {
    getEmbeddings,
    getEmbedding,
    initializeEmbeddingModel
};