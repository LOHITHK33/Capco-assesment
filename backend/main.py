from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import MeetingsResponse, ReconciledMeeting, SummaryStats
from reconciler import reconcile

app = FastAPI(title="Event Sync Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Reconcile once at startup and cache in memory
_cache: MeetingsResponse | None = None

def get_data() -> MeetingsResponse:
    global _cache
    if _cache is None:
        _cache = reconcile()
    return _cache


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/summary", response_model=SummaryStats)
def get_summary():
    return get_data().summary


@app.get("/api/meetings", response_model=MeetingsResponse)
def get_meetings():
    return get_data()


@app.get("/api/meetings/{meeting_id:path}", response_model=ReconciledMeeting)
def get_meeting(meeting_id: str):
    data = get_data()
    for m in data.meetings:
        if m.id == meeting_id:
            return m
    raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found")