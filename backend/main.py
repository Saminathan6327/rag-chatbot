from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import shutil
from chat_engine import generate_chat_response
from document_processor import process_and_upload

app = FastAPI(title="RAG Chatbot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.get("/")
def read_root():
    return {"message": "RAG Backend is running! 🚀"}

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts PDF or TXT file upload, processes it, and loads it to the RAG database.
    """
    temp_dir = "temp_uploads"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    temp_file_path = os.path.join(temp_dir, file.filename)
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process and upload the file to Pinecone
        process_and_upload(temp_file_path)
        
        status = "File processed and added to knowledge base successfully!"
        success = True
    except Exception as e:
        status = f"Error processing file: {str(e)}"
        success = False
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "status": status,
        "success": success
    }

@app.post("/chat/")
def chat(request: ChatRequest):
    response_text = generate_chat_response(request.query)
    return {"response": response_text}

if __name__ == "__main__":
    # This allows us to run the server by simply typing 'python main.py'
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)