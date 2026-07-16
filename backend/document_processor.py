import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter

# This tool helps us chop long documents into small, bite-sized pieces for the AI
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

def process_pdf(file_path):
    """
    Extracts text from a PDF file and splits it into chunks.
    """
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    
    chunks = text_splitter.split_text(text)
    
    print(f"-> Extracted {len(text)} characters and created {len(chunks)} chunks.")
    return chunks

# Example test logic
if __name__ == "__main__":
    # You can test this by pointing to a local PDF
    print("Document processor is ready. Please integrate with your upload route!")