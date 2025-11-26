import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

import IORedis from 'ioredis';

const connection = new IORedis({
    host: `${process.env.REDIS_URL}`,  // your host
    port: `${process.env.REDIS_PORT}`,  // your port
    password: `${process.env.REDIS_PASSWORD}`
});

const queue = new Queue('file-upload-queue', { connection });


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const username = req.query.username || 'Anonymous';
        const originalName = file.originalname;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const finalName = `${username}-${originalName}`;
        cb(null, finalName);
    }
});


const upload = multer({ storage: storage })



const app = express()
app.use(cors());

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
    await queue.add('file-ready', JSON.stringify({
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path
    }))
    res.json({ message: "File uploaded" })
})

app.get('/check-collection', async (req, res) => {
    const collectionName = req.query.name;
    if (!collectionName) return res.status(400).json({ error: 'Missing collection name' });

    
    try {
        // Step 1: Check if collection exists
        const checkResponse = await fetch(`${process.env.QDRANT_URL}/collections/${collectionName}`, {
            headers: { 'api-key': `${process.env.QDRANT_API_KEY}` }
        });

        if (checkResponse.status === 404) {
            return res.json({ exists: false, collection: collectionName });
        }

        if (!checkResponse.ok) {
            return res.status(500).json({ error: 'Unexpected error checking collection' });
        }

        // Step 2: Get stored vectors (limit to first few to extract metadata)
        const pointsResponse = await fetch(`${process.env.QDRANT_URL}/collections/${collectionName}/points/scroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': `${process.env.QDRANT_API_KEY}`
            },
            body: JSON.stringify({
                limit: 10, // adjust as needed
                with_payload: true
            })
        });

        const pointsData = await pointsResponse.json();


        // Extract unique source values (i.e., PDF names)
        const sources = pointsData.result?.points[0]?.payload?.metadata.source?.split('-')[1];

        return res.json({
            exists: true,
            collection: collectionName,
            sources: sources // remove duplicates
        });

    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.use(express.json()); // Make sure to parse JSON bodies

app.post('/delete-collection', async (req, res) => {
    const collectionName = req.body.collectionName;

    if (!collectionName) {
        return res.status(400).json({ error: 'Missing collectionName in request body' });
    }

   
    try {
        const response = await fetch(`${process.env.QDRANT_URL}/collections/${collectionName}`, {
            method: 'DELETE',
            headers: {
                'api-key': `${process.env.QDRANT_API_KEY}`
            }
        });

        if (response.status === 404) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(500).json({ error: 'Failed to delete collection', details: errorText });
        }

        return res.json({ message: `Collection '${collectionName}' deleted successfully` });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});


app.get('/', (req, res) => {
    res.json({ status: "Server running", })
})

app.get('/chat', async (req, res) => {

    const userQuery = req.query.userQuery
    const collection = req.query.collection
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: `${process.env.GOOGLE_API_KEY}`, // Use environment variable for security
        model: "text-embedding-004", // 768 dimensions
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        title: "Document title",
    });

    // Initialize Qdrant vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: `${process.env.QDRANT_URL}`,
        apiKey: `${process.env.QDRANT_API_KEY}`,

        collectionName: collection,
    });

    const retriever = vectorStore.asRetriever({

        k: 2,
    });
    const result = await retriever.invoke(userQuery);

    const SYSTEM_PROMPT = `You are helpful AI assistant who answers the query based on available context from PDF file`

    const Context = `${JSON.stringify(result)}`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",

        contents: [
            { role: 'user', parts: [{ text: userQuery, type: "text" }] },
            { role: 'model', parts: [{ text: Context, type: "text" }] },
        ],
        config: {
            systemInstruction: SYSTEM_PROMPT
        }
    });

    return res.json({ message: response.candidates[0]?.content.parts[0]?.text, docs: result })
})

app.listen(8000, () => {
    console.log("server is running on port 8000")
})
