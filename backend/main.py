from fastapi import FastAPI, UploadFile, File
import uvicorn

app = FastAPI(title="RAG Chatbot API")

@app.get("/")
def read_root():
    return {"message": "RAG Backend is running! 🚀"}

@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    """
    This endpoint accepts a PDF file upload from the frontend.
    In the next phase, we will process this file with LangChain!
    """
    # For now, we are just verifying that the server receives the file properly.
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "status": "File received successfully!"
    }

if __name__ == "__main__":
    # This allows us to run the server by simply typing 'python main.py'
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)