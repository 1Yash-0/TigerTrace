"""
Offline Conservation Intelligence Chatbot Service
--------------------------------------------------
Layered architecture for database-grounded natural language Q&A
about Pench Tiger Reserve data. Zero internet dependency.
"""

from .chatbot_service import ChatbotService
from .schemas import ChatRequest, ChatResponse

__all__ = ["ChatbotService", "ChatRequest", "ChatResponse"]
