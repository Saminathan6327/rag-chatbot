RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) AI Chatbot. This application allows users to upload custom text documents, processes them into vector embeddings, and uses a Large Language Model to answer questions based strictly on the provided context.

Features

Custom Knowledge Base: Feed the AI your own documents, notes, or articles.

Smart Context Retrieval: Uses Pinecone Vector Database for lightning-fast semantic search.

Powered by Gemini: Leverages the latest Google Gemini API (google-genai) for high-quality embedding and text generation.

Chunking & Processing: Automatically splits long documents into optimized chunks for better context matching.

Full Stack Architecture: Separated backend engine and frontend user interface. (import antigravity!)

Tech Stack

Language: Python 3

LLM & Embeddings: Google Gemini API (Models: gemini-1.5-flash, text-embedding-004)

Vector Database: Pinecone (768 dimensions, cosine metric)

Environment Management: python-dotenv

Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

Prerequisites

You will need the following accounts and API keys:

Google AI Studio: Free API key for Gemini.

Pinecone: Free account and API key. You must create an index named rag-chatbot with 768 dimensions.

Installation

Clone the repository

git clone https://github.com/YOUR-USERNAME/rag-chatbot.git
cd rag-chatbot


Set up the Virtual Environment

cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate


Install Dependencies

pip install google-genai pinecone-client python-dotenv


Environment Variables
Create a .env file in the backend directory and add your keys:

GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=rag-chatbot


Usage

1. Process and Upload Documents

To give the AI knowledge, run the document processor. This reads sample.txt, chunks it, and uploads the vectors to Pinecone.

python document_processor.py


2. Run the Chat Engine

Once the database is populated, you can run the chat engine to query your documents.

python chat_engine.py


Contributing

Contributions, issues, and feature requests are welcome!

Built with  and Python.
