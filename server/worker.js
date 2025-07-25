import { Worker } from 'bullmq';
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import IORedis from 'ioredis';

// Use dotenv if running locally
import dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis({
    host: process.env.REDIS_URL,       // your Redis host
    port: Number(process.env.REDIS_PORT),  // make sure port is a number
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
});

const worker = new Worker(
    'file-upload-queue',
    async (job) => {
        try {
            const data = JSON.parse(job.data);

            // Load PDF
            const loader = new PDFLoader(data.path);
            const CollectionName = data.path?.split('\\')[1]?.split('-')[0];

            const docs = await loader.load();

            if (!docs || docs.length === 0) {
                console.error("No documents loaded from the PDF.");
                return;
            }

            // Split text into smaller chunks
            const textSplitter = new CharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 0,
            });

            const chunks = [];
            for (const doc of docs) {
                const splitTexts = await textSplitter.splitText(doc.pageContent);
                splitTexts.forEach((text) => {
                    chunks.push({
                        pageContent: text,
                        metadata: doc.metadata,
                    });
                });
            }

            // Initialize embeddings
            const embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey: process.env.GOOGLE_API_KEY,
                model: "text-embedding-004",
                taskType: TaskType.RETRIEVAL_DOCUMENT,
                title: "Document title",
            });

            // Initialize Qdrant vector store
            const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY,
                collectionName: CollectionName,
            });

            console.log("Vector store initialized.");

            // Add chunks to vector store
            try {
                await vectorStore.addDocuments(chunks);
                console.log("All chunks are added to the vector store.");
            } catch (error) {
                console.error("Error adding documents to vector store:", error);
            }
        } catch (error) {
            console.error("Error processing job:", error);
        }
    },
    { concurrency: 100, connection }
);
