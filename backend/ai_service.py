import os
import json
import logging
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

# Configuration for Microsoft Foundry Local / Phi-4 Mini endpoint
def get_foundry_base_url() -> str:
    return os.getenv("FOUNDRY_BASE_URL", "http://127.0.0.1:53313/v1").rstrip("/")

def get_model_name() -> str:
    return os.getenv("MODEL_NAME", "phi-4-mini")

def get_timeout_seconds() -> float:
    return float(os.getenv("TIMEOUT_SECONDS", "180.0"))

SYSTEM_PROMPT = """You are AI Study Assistant, an expert, encouraging, and highly efficient academic tutor for university students. Provide clear, accurate, and concise explanations to help students learn effectively."""

def sanitize_messages(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Clean and deduplicate message history to ensure strictly 1 system message and clean turn history."""
    sanitized = []
    for msg in messages:
        role = str(msg.get("role", "user")).strip().lower()
        content = str(msg.get("content", "")).strip()
        
        if not content:
            continue
        # Strictly ignore system messages from client history to ensure only 1 system message at index 0
        if role not in ("user", "assistant"):
            continue
            
        # Deduplicate consecutive identical messages
        if sanitized and sanitized[-1]["role"] == role and sanitized[-1]["content"] == content:
            continue
            
        sanitized.append({"role": role, "content": content})
    return sanitized

def remove_repetitive_loops(text: str) -> str:
    """Detect and remove repetitive looping sentences/paragraphs from model output."""
    if not text:
        return text
    
    lines = text.split("\n")
    cleaned_lines = []
    seen_counts = {}
    
    for line in lines:
        stripped = line.strip()
        if stripped:
            # If the exact same line was already seen 2+ times consecutively, skip repetition loop
            if cleaned_lines and cleaned_lines[-1].strip() == stripped:
                seen_counts[stripped] = seen_counts.get(stripped, 1) + 1
                if seen_counts[stripped] >= 2:
                    continue
            else:
                seen_counts[stripped] = 1
        cleaned_lines.append(line)
        
    return "\n".join(cleaned_lines)

class AIService:
    @property
    def base_url(self) -> str:
        return get_foundry_base_url()

    @property
    def model(self) -> str:
        return get_model_name()

    @property
    def timeout(self) -> float:
        return get_timeout_seconds()

    def get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json"
        }

    async def check_health(self) -> Dict[str, Any]:
        """Check if Microsoft Foundry Local endpoint is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                models_url = f"{self.base_url}/models"
                response = await client.get(models_url)
                if response.status_code == 200:
                    return {
                        "status": "connected",
                        "endpoint": self.base_url,
                        "model": self.model,
                        "details": response.json()
                    }
                else:
                    return {
                        "status": "warning",
                        "endpoint": self.base_url,
                        "model": self.model,
                        "message": f"Endpoint returned status code {response.status_code}"
                    }
        except Exception as e:
            return {
                "status": "disconnected",
                "endpoint": self.base_url,
                "model": self.model,
                "error": str(e),
                "message": "Local AI model endpoint unreachable. Please verify Microsoft Foundry Local is running."
            }

    async def get_resolved_model_id(self) -> str:
        """Dynamically resolve exact model ID returned by /v1/models."""
        configured_model = self.model
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/models")
                if res.status_code == 200:
                    data = res.json()
                    models_list = data.get("data", [])
                    if models_list:
                        # 1. Exact match
                        for m in models_list:
                            m_id = m.get("id", "")
                            if m_id == configured_model:
                                return m_id
                        # 2. Case-insensitive / substring / parent match
                        conf_lower = configured_model.lower()
                        for m in models_list:
                            m_id = m.get("id", "")
                            m_parent = m.get("parent", "")
                            if conf_lower in m_id.lower() or conf_lower in m_parent.lower():
                                return m_id
                        # 3. Fallback to first available loaded model
                        first_id = models_list[0].get("id", "")
                        if first_id:
                            return first_id
        except Exception as e:
            logger.warning(f"Could not resolve model ID via /models: {e}")
        return configured_model

    async def generate_response(self, messages: List[Dict[str, str]], stream: bool = False) -> Dict[str, Any]:
        """Generate response from local Phi-4 Mini model."""
        target_model = await self.get_resolved_model_id()
        sanitized = sanitize_messages(messages)
        formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + sanitized

        payload = {
            "model": target_model,
            "messages": formatted_messages,
            "temperature": 0.2,
            "top_p": 0.9,
            "repetition_penalty": 1.15,
            "max_tokens": 500,
            "stream": stream
        }

        print(f"[FOUNDRY PAYLOAD (generate_response)]:\n{json.dumps(payload, indent=2, ensure_ascii=False)}", flush=True)
        logger.info(f"Payload sent to Foundry: {json.dumps(payload, ensure_ascii=False)}")

        chat_url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(chat_url, headers=self.get_headers(), json=payload)
                if res.status_code != 200:
                    logger.error(f"Foundry Local error {res.status_code}: {res.text}")
                    return {
                        "error": True,
                        "message": f"Local AI Error ({res.status_code}): {res.text or 'Check Foundry Local status.'}"
                    }
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                clean_content = remove_repetitive_loops(content)
                return {
                    "error": False,
                    "reply": clean_content,
                    "model": data.get("model", self.model)
                }
        except httpx.ConnectError:
            logger.warning("Could not connect to local AI endpoint.")
            return {
                "error": True,
                "message": f"Cannot connect to local AI endpoint at {self.base_url}. Please ensure Microsoft Foundry Local is running with Phi-4 Mini."
            }
        except httpx.TimeoutException:
            return {
                "error": True,
                "message": "The local AI model timed out while generating a response. Try a shorter query."
            }
        except Exception as e:
            logger.exception("Unexpected error in generate_response")
            return {
                "error": True,
                "message": f"Error interacting with local AI: {str(e)}"
            }

    async def generate_stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream chunks from local model endpoint (SSE standard) with loop protection."""
        target_model = await self.get_resolved_model_id()
        sanitized = sanitize_messages(messages)
        formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + sanitized

        payload = {
            "model": target_model,
            "messages": formatted_messages,
            "temperature": 0.2,
            "top_p": 0.9,
            "repetition_penalty": 1.15,
            "max_tokens": 500,
            "stream": True
        }

        print(f"[FOUNDRY PAYLOAD (generate_stream)]:\n{json.dumps(payload, indent=2, ensure_ascii=False)}", flush=True)
        logger.info(f"Payload sent to Foundry: {json.dumps(payload, ensure_ascii=False)}")

        chat_url = f"{self.base_url}/chat/completions"
        recent_lines: List[str] = []

        last_chunk = ""
        same_chunk_count = 0

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", chat_url, headers=self.get_headers(), json=payload) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': f'Foundry Local returned HTTP status {response.status_code}'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                json_obj = json.loads(data_str)
                                choices = json_obj.get("choices", [])
                                if not choices:
                                    continue
                                delta = choices[0].get("delta", {})
                                chunk = delta.get("content", "")
                                if chunk:
                                    # 1. Single token repetition loop guard (e.g. " in", " in", " in" ...)
                                    if chunk == last_chunk and chunk.strip():
                                        same_chunk_count += 1
                                        if same_chunk_count >= 5:
                                            logger.warning("Terminating stream early due to token repetition loop.")
                                            yield "data: [DONE]\n\n"
                                            return
                                    else:
                                        last_chunk = chunk
                                        same_chunk_count = 1

                                    # 2. Line repetition loop guard
                                    if "\n" in chunk:
                                        lines_in_chunk = chunk.split("\n")
                                        for l in lines_in_chunk[:-1]:
                                            st = l.strip()
                                            if st and recent_lines.count(st) >= 2 and recent_lines[-1] == st:
                                                logger.warning("Terminating stream early due to line repetition loop.")
                                                yield "data: [DONE]\n\n"
                                                return
                                            if st:
                                                recent_lines.append(st)
                                                if len(recent_lines) > 20:
                                                    recent_lines.pop(0)

                                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                            except Exception:
                                pass
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Connection issue: {str(e)}'})}\n\n"

ai_service = AIService()

