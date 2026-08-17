"""
Pydantic schemas for the chatbot request/response cycle.
"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


class Intent(str, Enum):
    """All supported chatbot intents."""
    GET_TIGER_LIST          = "GET_TIGER_LIST"
    GET_TIGER_PROFILE       = "GET_TIGER_PROFILE"
    GET_TIGER_DETECTIONS    = "GET_TIGER_DETECTIONS"
    GET_TIGER_MOVEMENT      = "GET_TIGER_MOVEMENT"
    GET_TIGER_HOME_RANGE    = "GET_TIGER_HOME_RANGE"
    GET_TERRITORY_OVERLAPS  = "GET_TERRITORY_OVERLAPS"
    GET_TIGER_ALERTS        = "GET_TIGER_ALERTS"
    GET_BUFFER_MOVEMENT     = "GET_BUFFER_MOVEMENT"
    GET_ABSENT_TIGERS       = "GET_ABSENT_TIGERS"
    GET_STATION_ACTIVITY    = "GET_STATION_ACTIVITY"
    GET_RECENT_ALERTS       = "GET_RECENT_ALERTS"
    GET_MOVEMENT_DEVIATIONS = "GET_MOVEMENT_DEVIATIONS"
    GET_HIGH_RISK_STATIONS  = "GET_HIGH_RISK_STATIONS"
    GET_VILLAGE_PROXIMITY   = "GET_VILLAGE_PROXIMITY"
    GET_PROCESSING_STATS    = "GET_PROCESSING_STATS"
    GET_BLANK_FILTERING     = "GET_BLANK_FILTERING"
    GET_CYCLE_SUMMARY       = "GET_CYCLE_SUMMARY"
    GET_REVIEW_STATUS       = "GET_REVIEW_STATUS"
    GET_NEW_TIGERS          = "GET_NEW_TIGERS"
    GET_CAMERA_HEALTH       = "GET_CAMERA_HEALTH"
    GET_SYSTEM_STATUS       = "GET_SYSTEM_STATUS"
    GET_PATROL_PRIORITY     = "GET_PATROL_PRIORITY"
    GET_STATION_PATROL_PRIORITY = "GET_STATION_PATROL_PRIORITY"
    GET_SUGGESTED_PATROL_SEQUENCE = "GET_SUGGESTED_PATROL_SEQUENCE"
    GET_PATROL_TREND        = "GET_PATROL_TREND"
    GET_HELP                = "GET_HELP"
    UNKNOWN                 = "UNKNOWN"


class ChatRequest(BaseModel):
    """Incoming chat message from the frontend."""
    message: str = Field(..., min_length=1, max_length=1000)


class ActionLink(BaseModel):
    """Suggested action button for the frontend."""
    label: str
    route: str
    icon: Optional[str] = None


class ChatResponse(BaseModel):
    """Structured chatbot response."""
    success: bool = True
    intent: str = Intent.UNKNOWN.value
    answer: str = ""
    entities: dict = Field(default_factory=dict)
    data: Optional[Any] = None
    actions: list[ActionLink] = Field(default_factory=list)
    mode: str = "OFFLINE"
