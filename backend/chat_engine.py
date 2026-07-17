import os
from google import genai
from google.genai import types
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env
load_dotenv(dotenv_path=".env")

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

# Initialize clients
client = genai.Client(api_key=GEMINI_KEY)
pc = Pinecone(api_key=PINECONE_KEY)

# Get index dimensions
try:
    index_info = pc.describe_index(INDEX_NAME)
    INDEX_DIMENSION = index_info.dimension
    print(f"Chat Engine: Connected to Pinecone index '{INDEX_NAME}' with dimension {INDEX_DIMENSION}.")
except Exception as e:
    INDEX_DIMENSION = 768
    print(f"Chat Engine Warning: Could not describe index '{INDEX_NAME}'. Defaulting dimension to {INDEX_DIMENSION}. Error: {e}")

index = pc.Index(INDEX_NAME)

def get_context(query, top_k=3):
    """Retrieves relevant document chunks from Pinecone for a given query."""
    try:
        # Generate query embedding
        result = client.models.embed_content(
            model="gemini-embedding-2",
            contents=query,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=INDEX_DIMENSION
            )
        )
        query_embedding = result.embeddings[0].values
        
        # Query Pinecone
        results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
        
        # Extract text chunks from matches
        context_chunks = []
        for match in results.get('matches', []):
            if match.get('metadata') and 'text' in match['metadata']:
                context_chunks.append(match['metadata']['text'])
                
        context = "\n\n".join(context_chunks)
        return context
    except Exception as e:
        print(f"Error retrieving context: {e}")
        return ""

def generate_chat_response(user_query):
    """Fetches relevant context and generates a chat response using Gemini 2.5 Flash."""
    context = get_context(user_query)
    
    system_prompt = (
        "You are a helpful and intelligent assistant.\n"
        "Use the provided context to answer the user's question accurately.\n"
        "If you do not know the answer or the context does not contain enough information, "
        "state that clearly but helpfully.\n\n"
        f"Context:\n{context}"
    )
    
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=user_query,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7
            )
        )
        return response.text
    except Exception as e:
        return f"Error generating response: {e}"

if __name__ == "__main__":
    print("\n=== Interactive RAG Chatbot CLI ===")
    print("Type your questions below. Type 'exit' or 'quit' to stop.")
    while True:
        try:
            query = input("\nYou: ")
            if not query.strip():
                continue
            if query.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            
            print("Thinking...")
            answer = generate_chat_response(query)
            print(f"Bot: {answer}")
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")
