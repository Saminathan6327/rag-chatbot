import os
import openai
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env
load_dotenv(dotenv_path=".env")

# --- FORCED OVERRIDE FOR TESTING ---
# Replace these with your actual keys if the environment isn't reading correctly
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

print(f"DEBUG: Using OpenAI Key starting with: {OPENAI_KEY[:7] if OPENAI_KEY else 'None'}")

# Initialize clients with explicit keys
client = openai.OpenAI(api_key=OPENAI_KEY)
pc = Pinecone(api_key=PINECONE_KEY)
index = pc.Index(INDEX_NAME)

def get_context(query, top_k=3):
    try:
        query_embedding = client.embeddings.create(
            input=query,
            model="text-embedding-3-small"
        ).data[0].embedding
        results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
        context = "\n".join([match['metadata']['text'] for match in results['matches']])
        return context
    except Exception as e:
        print(f"Error retrieving context: {e}")
        return ""

def generate_chat_response(user_query):
    context = get_context(user_query)
    system_prompt = f"You are a helpful assistant. Use the provided context to answer the user's question.\nContext:\n{context}"
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating response: {e}"

if __name__ == "__main__":
    test_query = "What is this document about?"
    print(f"Query: {test_query}")
    answer = generate_chat_response(test_query)
    print(f"Answer: {answer}")