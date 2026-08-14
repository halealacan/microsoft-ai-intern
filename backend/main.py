from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from ai_service import ai_service

app = FastAPI(
    title="AI Study Assistant API",
    description="FastAPI Backend for AI Study Assistant powered by Google Gemini API and Gemini 3.5 Flash",
    version="1.0.0"
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker: user, assistant, or system")
    content: str = Field(..., description="Text content of the message")

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    reply: str
    model: str
    error: bool = False

class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="The subject or topic for the quiz")
    question_count: int = Field(default=5, ge=1, le=20, description="Number of questions (1-20)")

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: str

class QuizResponse(BaseModel):
    title: str
    questions: List[QuizQuestion]

class PDFUploadResponse(BaseModel):
    name: str
    uri: str
    mime_type: str
    display_name: Optional[str] = None

class PDFSummarizeRequest(BaseModel):
    file_name: Optional[str] = Field(None, description="Gemini file name (e.g. files/abc123xyz)")
    file_uri: Optional[str] = Field(None, description="Gemini file URI (e.g. https://generativelanguage.googleapis.com/v1beta/files/abc123xyz)")

class PDFSummarizeResponse(BaseModel):
    summary: str
    model: str

class PDFQuizRequest(BaseModel):
    file_name: Optional[str] = Field(None, description="Gemini file name (e.g. files/abc123xyz)")
    file_uri: Optional[str] = Field(None, description="Gemini file URI (e.g. https://generativelanguage.googleapis.com/v1beta/files/abc123xyz)")
    question_count: int = Field(default=5, ge=1, le=20, description="Number of questions (1-20)")

@app.get("/")
def read_root():
    return {
        "app": "AI Study Assistant API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    """Returns system status and connection state to local AI model."""
    status = await ai_service.check_health()
    return status

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Standard non-streaming chat endpoint."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")
    
    dict_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    result = await ai_service.generate_response(dict_messages, stream=False)
    
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result.get("message"))
        
    return ChatResponse(
        reply=result["reply"],
        model=result["model"],
        error=False
    )

@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Server-Sent Events (SSE) streaming chat endpoint."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")
    
    dict_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    return StreamingResponse(
        ai_service.generate_stream(dict_messages),
        media_type="text/event-stream"
    )

@app.post("/api/quiz", response_model=QuizResponse)
async def quiz_endpoint(request: QuizRequest):
    """Generate a multiple-choice quiz on a given topic."""
    result = await ai_service.generate_quiz(
        topic=request.topic,
        question_count=request.question_count,
    )

    if result.get("error"):
        raise HTTPException(status_code=503, detail=result.get("message"))

    return QuizResponse(
        title=result["title"],
        questions=[
            QuizQuestion(
                question=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
            )
            for q in result["questions"]
        ],
    )


@app.post("/api/pdf/upload", response_model=PDFUploadResponse)
async def upload_pdf_endpoint(file: UploadFile = File(...)):
    """Upload a PDF document to Gemini Files API and return metadata."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are allowed."
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    result = await ai_service.upload_file(
        file_bytes=contents,
        filename=file.filename,
        mime_type=file.content_type or "application/pdf"
    )

    if result.get("error"):
        raise HTTPException(
            status_code=503,
            detail=result.get("message", "Failed to upload file to Gemini.")
        )

    return PDFUploadResponse(
        name=result["name"],
        uri=result["uri"],
        mime_type=result["mime_type"],
        display_name=result.get("display_name")
    )


@app.post("/api/pdf/summarize", response_model=PDFSummarizeResponse)
async def summarize_pdf_endpoint(request: PDFSummarizeRequest):
    """Summarize an uploaded PDF using Gemini 3.5 Flash."""
    if not request.file_name and not request.file_uri:
        raise HTTPException(
            status_code=400,
            detail="Either file_name or file_uri must be provided."
        )

    result = await ai_service.summarize_pdf(
        file_uri=request.file_uri,
        file_name=request.file_name
    )

    if result.get("error"):
        raise HTTPException(
            status_code=503,
            detail=result.get("message", "Failed to summarize PDF.")
        )

    return PDFSummarizeResponse(
        summary=result["summary"],
        model=result["model"]
    )


@app.post("/api/pdf/quiz", response_model=QuizResponse)
async def pdf_quiz_endpoint(request: PDFQuizRequest):
    """Generate a multiple-choice quiz directly from an uploaded PDF document."""
    if not request.file_name and not request.file_uri:
        raise HTTPException(
            status_code=400,
            detail="Either file_name or file_uri must be provided."
        )

    result = await ai_service.generate_pdf_quiz(
        file_uri=request.file_uri,
        file_name=request.file_name,
        question_count=request.question_count,
    )

    if result.get("error"):
        raise HTTPException(
            status_code=503,
            detail=result.get("message", "Failed to generate PDF quiz.")
        )

    return QuizResponse(
        title=result["title"],
        questions=[
            QuizQuestion(
                question=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
            )
            for q in result["questions"]
        ],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
