# TalkToPDF - RAG-Based Question Answering Over PDFs

TalkToPDF is a Retrieval-Augmented Generation (RAG) system that allows users to upload a PDF and ask natural language questions about its contents. It leverages vector embeddings, Qdrant (Vector DB), and Gemini 2.0 Flash to provide accurate and context-aware answers.

# Code Flow Diagram

![Image](https://github.com/user-attachments/assets/d497e365-7df7-4edc-a24c-8473e4919890)

# Project Workflow

**1. PDF Upload:**
Users upload a PDF via the web app (/upload endpoint).

**2. Processing (Node.js Worker):**
The PDF is parsed and split into chunks.
Each chunk is converted into vector embeddings.

**3. Vector Storage:**
Embeddings are stored in Qdrant, a high-performance vector database.

**4. Query Handling:**
User submits a natural language question.
The query is embedded and sent to Qdrant for semantic similarity search.

**5. Answer Generation (Gemini 2.0 Flash):**
Relevant chunks are retrieved and passed to Gemini 2.0 Flash, which generates a contextual answer.
