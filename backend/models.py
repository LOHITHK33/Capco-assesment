from pydantic import BaseModel
from typing import Optional, Literal


class CRMEvent(BaseModel):
    crm_id: str
    subject: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    relationship_owner: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


class CalendarEvent(BaseModel):
    event_id: str
    title: Optional[str] = None
    organizer: Optional[str] = None
    attendees: list[str] = []
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_recurring: bool = False
    status: Optional[str] = None
    created_at: Optional[str] = None


class Conflict(BaseModel):
    field: str
    crm_value: Optional[str] = None
    cal_value: Optional[str] = None
    description: str
    severity: Literal["high", "medium", "low"]


class DataQualityIssues(BaseModel):
    crm: list[str] = []
    cal: list[str] = []


class ReconciledMeeting(BaseModel):
    id: str
    source: Literal["both", "crm_only", "cal_only"]
    subject: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    relationship_owner: Optional[str] = None
    meeting_type: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    attendees: list[str] = []
    is_recurring: bool = False
    conflicts: list[Conflict] = []
    data_quality: DataQualityIssues = DataQualityIssues()
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None
    crm_record: Optional[CRMEvent] = None
    cal_record: Optional[CalendarEvent] = None


class SummaryStats(BaseModel):
    total: int
    matched: int
    crm_only: int
    cal_only: int
    with_conflicts: int
    with_data_issues: int
    flagged_duplicates: int


class MeetingsResponse(BaseModel):
    meetings: list[ReconciledMeeting]
    summary: SummaryStats