import os
import json
import logging
import asyncio
from typing import AsyncGenerator, Dict, Any, List

from dotenv import load_dotenv
from google import genai
from google.genai import types, errors

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

SYSTEM_PROMPT = """
You are AI Study Assistant, an expert academic tutor for university students.

Rules:
- Always answer in the same language as the user.
- Give clear, accurate, concise, and well-structured explanations.
- Use simple examples when they help learning.
- Do not invent facts.
- Do not repeat the same sentence or idea unnecessarily.
- If the user's question is unclear, ask one short clarification question.
""".strip()

MAX_RETRIES = 3
RETRY_DELAYS = (1, 2, 4)


def get_api_key() -> str:
    return os.getenv("GOOGLE_API_KEY", "").strip()


def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()


def sanitize_messages(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    sanitized: List[Dict[str, str]] = []

    for msg in messages:
        role = str(msg.get("role", "user")).strip().lower()
        content = str(msg.get("content", "")).strip()

        if not content:
            continue

        if role not in ("user", "assistant"):
            continue

        if (
            sanitized
            and sanitized[-1]["role"] == role
            and sanitized[-1]["content"] == content
        ):
            continue

        sanitized.append({"role": role, "content": content})

    return sanitized


def to_gemini_contents(messages: List[Dict[str, str]]) -> List[types.Content]:
    contents: List[types.Content] = []

    for msg in sanitize_messages(messages):
        gemini_role = "model" if msg["role"] == "assistant" else "user"
        contents.append(
            types.Content(
                role=gemini_role,
                parts=[types.Part.from_text(text=msg["content"])],
            )
        )

    return contents


def is_retryable_api_error(exc: Exception) -> bool:
    retryable_codes = {429, 500, 502, 503, 504}
    code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)

    if code in retryable_codes or status_code in retryable_codes:
        return True

    text = str(exc).upper()
    return any(
        token in text
        for token in (
            "429",
            "500",
            "502",
            "503",
            "504",
            "UNAVAILABLE",
            "RESOURCE_EXHAUSTED",
        )
    )


class AIService:
    @property
    def model(self) -> str:
        return get_model_name()

    def _create_client(self) -> genai.Client:
        api_key = get_api_key()

        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY is missing. Add it to backend/.env and restart the backend."
            )

        return genai.Client(api_key=api_key)

    def _generation_config(self) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
            top_p=0.9,
            max_output_tokens=8192,
        )

    async def check_health(self) -> Dict[str, Any]:
        try:
            client = self._create_client()

            try:
                model_info = await client.aio.models.get(model=self.model)

                return {
                    "status": "connected",
                    "provider": "Google Gemini API",
                    "model": self.model,
                    "details": {
                        "name": getattr(model_info, "name", self.model),
                        "display_name": getattr(model_info, "display_name", None),
                    },
                }

            finally:
                await client.aio.aclose()

        except errors.APIError as e:
            logger.error("Gemini health check API error: %s", e)

            return {
                "status": "disconnected",
                "provider": "Google Gemini API",
                "model": self.model,
                "error": str(e),
                "message": "Gemini API connection failed. Check your API key and model name.",
            }

        except Exception as e:
            logger.exception("Gemini health check failed")

            return {
                "status": "disconnected",
                "provider": "Google Gemini API",
                "model": self.model,
                "error": str(e),
                "message": "Gemini API connection failed.",
            }

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
    ) -> Dict[str, Any]:
        contents = to_gemini_contents(messages)

        if not contents:
            return {
                "error": True,
                "message": "No valid user message was provided.",
            }

        logger.info(
            "Gemini request: model=%s, messages=%s",
            self.model,
            json.dumps(sanitize_messages(messages), ensure_ascii=False),
        )

        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                client = self._create_client()

                try:
                    response = await client.aio.models.generate_content(
                        model=self.model,
                        contents=contents,
                        config=self._generation_config(),
                    )
                finally:
                    await client.aio.aclose()

                reply = (response.text or "").strip()

                if not reply:
                    return {
                        "error": True,
                        "message": "Gemini returned an empty response.",
                    }

                return {
                    "error": False,
                    "reply": reply,
                    "model": self.model,
                }

            except errors.APIError as e:
                last_error = e

                if is_retryable_api_error(e) and attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Temporary Gemini API error on attempt %s/%s: %s. Retrying in %ss.",
                        attempt + 1,
                        MAX_RETRIES,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.error("Gemini API error after %s attempt(s): %s", attempt + 1, e)

                return {
                    "error": True,
                    "message": f"Gemini API Error: {e}",
                }

            except Exception as e:
                logger.exception("Unexpected error in generate_response")

                return {
                    "error": True,
                    "message": f"Error interacting with Gemini: {str(e)}",
                }

        return {
            "error": True,
            "message": f"Gemini API Error: {last_error or 'Unknown temporary error'}",
        }

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
    ) -> AsyncGenerator[str, None]:
        contents = to_gemini_contents(messages)

        if not contents:
            yield f"data: {json.dumps({'error': 'No valid user message was provided.'})}\n\n"
            return

        last_error = None

        for attempt in range(MAX_RETRIES):
            emitted_text = False

            try:
                client = self._create_client()

                try:
                    stream = await client.aio.models.generate_content_stream(
                        model=self.model,
                        contents=contents,
                        config=self._generation_config(),
                    )

                    async for chunk in stream:
                        text = chunk.text or ""

                        if text:
                            emitted_text = True
                            yield f"data: {json.dumps({'chunk': text}, ensure_ascii=False)}\n\n"

                    yield "data: [DONE]\n\n"
                    return

                finally:
                    await client.aio.aclose()

            except errors.APIError as e:
                last_error = e

                if (
                    is_retryable_api_error(e)
                    and not emitted_text
                    and attempt < MAX_RETRIES - 1
                ):
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Temporary Gemini streaming error on attempt %s/%s: %s. Retrying in %ss.",
                        attempt + 1,
                        MAX_RETRIES,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.error(
                    "Gemini streaming API error after %s attempt(s): %s",
                    attempt + 1,
                    e,
                )

                yield f"data: {json.dumps({'error': f'Gemini API Error: {e}'}, ensure_ascii=False)}\n\n"
                return

            except Exception as e:
                logger.exception("Unexpected error in generate_stream")

                yield f"data: {json.dumps({'error': f'Gemini connection issue: {str(e)}'}, ensure_ascii=False)}\n\n"
                return

        final_error = last_error or "Temporary service failure"
        yield f"data: {json.dumps({'error': f'Gemini API Error: {final_error}'}, ensure_ascii=False)}\n\n"


    async def generate_quiz(
        self,
        topic: str,
        question_count: int,
    ) -> dict:
        """Generate a multiple-choice quiz on a given topic using Gemini."""

        prompt = f"""You are an expert academic quiz creator.

Create a multiple-choice quiz about: "{topic}"
Number of questions: {question_count}

STRICT RULES:
- Each question must have exactly 4 answer options (A, B, C, D).
- correct_answer is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).
- explanation must be a concise 1-2 sentence justification of the correct answer.
- Use the same language as the topic text.
- Do NOT include any text outside the JSON.

Return ONLY a valid JSON object in this exact structure:
{{
  "title": "Quiz title here",
  "questions": [
    {{
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation of why the answer is correct."
    }}
  ]
}}"""

        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                client = self._create_client()

                try:
                    from google.genai import types as _types

                    response = await client.aio.models.generate_content(
                        model=self.model,
                        contents=prompt,
                        config=_types.GenerateContentConfig(
                            temperature=0.4,
                            top_p=0.9,
                            max_output_tokens=4096,
                            response_mime_type="application/json",
                        ),
                    )
                finally:
                    await client.aio.aclose()

                raw = (response.text or "").strip()

                try:
                    import json as _json

                    data = _json.loads(raw)
                except Exception:
                    logger.error("Quiz JSON parse failed. Raw response:\n%s", raw[:500])
                    return {
                        "error": True,
                        "message": "Gemini returned an invalid JSON response. Please try again.",
                    }

                if "questions" not in data or not isinstance(data.get("questions"), list):
                    return {
                        "error": True,
                        "message": "Gemini response is missing the 'questions' field.",
                    }

                for q in data["questions"]:
                    q.setdefault("question", "")
                    q.setdefault("options", [])
                    q.setdefault("correct_answer", 0)
                    q.setdefault("explanation", "")

                data.setdefault("title", f"{topic} Quiz")
                data["error"] = False
                return data

            except errors.APIError as e:
                last_error = e
                if is_retryable_api_error(e) and attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Temporary Gemini API error in generate_quiz on attempt %s/%s: %s. Retrying in %ss.",
                        attempt + 1,
                        MAX_RETRIES,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.error("Gemini API error in generate_quiz: %s", e)
                return {
                    "error": True,
                    "message": f"Gemini API Error: {e}",
                }

            except Exception as e:
                logger.exception("Unexpected error in generate_quiz")
                return {
                    "error": True,
                    "message": f"Error interacting with Gemini: {str(e)}",
                }

        return {
            "error": True,
            "message": f"Gemini API Error: {last_error or 'Unknown temporary error'}",
        }


ai_service = AIService()