"""
Chatbot Service — Main orchestrator that wires together
entity extraction → intent classification → query execution → response generation.
"""
import json
import traceback
from sqlalchemy.orm import Session
from .schemas import ChatRequest, ChatResponse, Intent, ActionLink
from .entity_extractor import extract_entities
from .intent_router import classify_intent
from .query_engine import execute_query
from .response_generator import generate_response


class ChatbotService:
    """
    Offline Conservation Intelligence Chatbot.
    
    Pipeline:
        User message → Entity Extraction → Intent Classification →
        Query Execution → Response Generation → ChatResponse
    
    All operations are local, read-only, and deterministic.
    """

    def process_message(self, request: ChatRequest, db: Session) -> ChatResponse:
        """
        Process a user message through the full chatbot pipeline.
        
        Args:
            request: ChatRequest with the user's message
            db: SQLAlchemy database session
        
        Returns:
            ChatResponse with answer, intent, entities, data, and actions
        """
        message = request.message.strip()

        try:
            # ── Step 1: Extract entities ─────────────────────────────────
            entities = extract_entities(message, db)

            # ── Step 2: Classify intent ──────────────────────────────────
            intent = classify_intent(message, entities)

            # ── Step 3: Execute query ────────────────────────────────────
            if intent == Intent.GET_HELP or intent == Intent.UNKNOWN:
                data = {}
            else:
                data = execute_query(intent, entities, db)

            # ── Step 4: Generate response ────────────────────────────────
            answer, actions = generate_response(intent, entities, data)

            # ── Step 5: Save to chat history ─────────────────────────────
            self._save_history(db, message, intent.value, entities, answer)

            return ChatResponse(
                success=True,
                intent=intent.value,
                answer=answer,
                entities={k: v for k, v in entities.items() if v is not None},
                data=data,
                actions=actions,
                mode="OFFLINE",
            )

        except Exception as e:
            print(f"[CHATBOT ERROR] {traceback.format_exc()}")
            return ChatResponse(
                success=False,
                intent=Intent.UNKNOWN.value,
                answer=f"⚠️ I encountered an error processing your question: {str(e)}\n\nPlease try rephrasing or type \"help\" to see what I can answer.",
                entities={},
                data=None,
                actions=[ActionLink(label="See Help", route="/chat", icon="MessageSquare")],
                mode="OFFLINE",
            )

    def _save_history(self, db: Session, message: str, intent: str, entities: dict, response: str):
        """Persist the chat exchange for history retrieval."""
        try:
            from database import ChatMessage
            entry = ChatMessage(
                message=message,
                intent=intent,
                entities_json=json.dumps({k: v for k, v in entities.items() if v is not None}),
                response=response,
                mode="OFFLINE",
            )
            db.add(entry)
            db.commit()
        except Exception as e:
            print(f"[CHATBOT WARN] Failed to save chat history: {e}")
            # Non-critical — don't fail the response
            try:
                db.rollback()
            except Exception:
                pass

    def get_history(self, db: Session, limit: int = 50) -> list[dict]:
        """Retrieve chat history."""
        try:
            from database import ChatMessage
            messages = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(limit).all()
            return [{
                "id": m.id,
                "message": m.message,
                "intent": m.intent,
                "entities": json.loads(m.entities_json) if m.entities_json else {},
                "response": m.response,
                "mode": m.mode,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            } for m in reversed(messages)]
        except Exception as e:
            print(f"[CHATBOT WARN] Failed to load chat history: {e}")
            return []

    def clear_history(self, db: Session) -> bool:
        """Clear all chat history."""
        try:
            from database import ChatMessage
            db.query(ChatMessage).delete()
            db.commit()
            return True
        except Exception as e:
            print(f"[CHATBOT WARN] Failed to clear chat history: {e}")
            db.rollback()
            return False
