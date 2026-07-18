import os
import time
import pdfplumber
from google import genai
from google.genai import types
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load .env relative to the current file's directory
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(base_dir, ".env"))

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

print(f"DEBUG: Pinecone Key starts with: {PINECONE_KEY[:7] if PINECONE_KEY else 'None'}")

# Initialize clients
client = genai.Client(api_key=GEMINI_KEY)
pc = Pinecone(api_key=PINECONE_KEY)

# Create index if it does not exist
existing_indexes = [idx.name for idx in pc.list_indexes()]
if INDEX_NAME not in existing_indexes:
    print(f"Creating index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=768,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
    # Wait for index to be ready
    while not pc.describe_index(INDEX_NAME).status['ready']:
        print("Waiting for index to be ready...")
        time.sleep(1)

# Describe index to determine its dimension
index_info = pc.describe_index(INDEX_NAME)
INDEX_DIMENSION = index_info.dimension
print(f"Using index '{INDEX_NAME}' with dimension {INDEX_DIMENSION}.")

index = pc.Index(INDEX_NAME)

def chunk_text(text, chunk_size=100):
    """Splits a long text into smaller chunks of words for better retrieval."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def extract_text_from_pdf(filepath):
    """Extracts text from a PDF file using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF {filepath}: {e}")
    return text

def process_file(filepath):
    """Determines file type and extracts its text contents."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".txt":
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading TXT {filepath}: {e}")
    elif ext == ".pdf":
        return extract_text_from_pdf(filepath)
    else:
        print(f"Skipping unsupported file type: {filepath}")
    return ""

def process_and_upload(path):
    files_to_process = []
    if os.path.isdir(path):
        print(f"Scanning directory '{path}'...")
        for root, _, files in os.walk(path):
            for file in files:
                if file.lower().endswith(('.txt', '.pdf')):
                    files_to_process.append(os.path.join(root, file))
    elif os.path.isfile(path):
        files_to_process.append(path)
    else:
        print(f"Error: Path '{path}' not found.")
        return

    if not files_to_process:
        print("No .txt or .pdf files found to process.")
        return

    print(f"Found {len(files_to_process)} files to process.")
    
    for filepath in files_to_process:
        filename = os.path.basename(filepath)
        print(f"\nProcessing '{filename}'...")
        text = process_file(filepath)
        if not text.strip():
            print(f"Warning: No text extracted from '{filename}'. Skipping.")
            continue

        chunks = chunk_text(text, chunk_size=100)
        print(f"Split '{filename}' into {len(chunks)} chunks.")

        vectors = []
        for i, chunk in enumerate(chunks):
            print(f"Embedding chunk {i+1}/{len(chunks)}...")
            try:
                result = client.models.embed_content(
                    model="gemini-embedding-2",
                    contents=chunk,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=INDEX_DIMENSION
                    )
                )
                embedding = result.embeddings[0].values
                # Pinecone requires unique IDs: use filename + chunk index to prevent collisions
                vector_id = f"{filename}-chunk-{i}"
                # Include file source in metadata
                vectors.append((vector_id, embedding, {"text": chunk, "source": filename}))
            except Exception as e:
                print(f"Failed to embed chunk {i}: {e}")

        if vectors:
            print(f"Uploading {len(vectors)} vectors for '{filename}' to Pinecone...")
            index.upsert(vectors=vectors)
    
    print("\nAll uploads complete! Your database now has knowledge.")

if __name__ == "__main__":
    # Create a default "data" folder if it does not exist
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    if not os.path.exists(data_dir):
        print(f"Creating data directory '{data_dir}'...")
        os.makedirs(data_dir)
        
        # Create a sample file in data directory
        sample_file = os.path.join(data_dir, "sample.txt")
        print(f"Creating a sample file '{sample_file}'...")
        with open(sample_file, "w", encoding="utf-8") as f:
            f.write("The secret password to the vault is 'PINEAPPLE2026'.\n\n")
            f.write("Retrieval-Augmented Generation (RAG) is an AI framework that retrieves data from outside a foundation model and augments your prompts by adding the relevant retrieved data in context.")
    
    # Process the data directory
    process_and_upload(data_dir)