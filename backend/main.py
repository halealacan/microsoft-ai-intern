from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from ai_service import ai_service

app = FastAPI(
    title="AI Study Assistant API",
    description="FastAPI Backend for AI Study Assistant powered by Microsoft Foundry Local and Phi-4 Mini",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
