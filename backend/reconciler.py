import json
import re
from pathlib import Path
from datetime import datetime, date
from difflib import SequenceMatcher
from typing import Optional
from models import (
    CRMEvent, CalendarEvent, ReconciledMeeting,
    Conflict, DataQualityIssues, SummaryStats, MeetingsResponse
)

DATA_DIR = Path(__file__).parent / "data"


def load_data() -> tuple[list[CRMEvent], list[CalendarEvent]]:
    crm_raw = json.loads((DATA_DIR / "crm_events.json").read_text())
    cal_raw = json.loads((DATA_DIR / "calendar_events.json").read_text())
    crm = [CRMEvent(**r) for r in crm_raw]
    cal = [CalendarEvent(**r) for r in cal_raw]
    return crm, cal


def parse_crm_date(record: CRMEvent) -> Optional[date]:
    raw = (record.meeting_date or "").strip()
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        pass
    m = re.match(r"^(\d{2})-(\d{2})/(\d{4})$", raw)
    if m:
        month, day, year = m.groups()
        try:
            return date(int(year), int(month), int(day))
        except ValueError:
            pass
    return None


def parse_cal_date(record: CalendarEvent) -> Optional[date]:
    raw = (record.start_time or "").strip()
    if not raw:
        return None
    try:
        dt_str = raw.rstrip("Z").split("+")[0]
        return datetime.fromisoformat(dt_str).date()
    except ValueError:
        return None


def parse_crm_minutes(record: CRMEvent) -> Optional[int]:
    t = record.meeting_time
    if not t:
        return None
    m = re.match(r"^(\d{1,2}):(\d{2})$", str(t).strip())
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    return None


def parse_cal_minutes(record: CalendarEvent) -> Optional[int]:
    raw = (record.start_time or "").strip()
    if not raw:
        return None
    try:
        dt_str = raw.rstrip("Z").split("+")[0]
        dt = datetime.fromisoformat(dt_str)
        return dt.hour * 60 + dt.minute
    except ValueError:
        return None


def is_utc(record: CalendarEvent) -> bool:
    return (record.start_time or "").endswith("Z")


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def key_words(s: str) -> set:
    return {w.lower() for w in re.findall(r"[a-zA-Z]+", s) if len(w) > 3}


def client_in_attendees(crm: CRMEvent, cal: CalendarEvent) -> bool:
    attendees_str = " ".join(cal.attendees).lower()
    name = (crm.client_name or "").strip().lower()
    company = (crm.client_company or "").strip().lower()

    if name and name not in ("multiple", ""):
        parts = name.split()
        if parts and parts[-1] in attendees_str:
            return True
        if any(p in attendees_str for p in parts if len(p) > 3):
            return True

    if company:
        for word in key_words(company):
            if word in attendees_str:
                return True

    return False


MATCH_THRESHOLD = 30.0


def score_match(crm: CRMEvent, cal: CalendarEvent) -> float:
    crm_date = parse_crm_date(crm)
    cal_date = parse_cal_date(cal)
    if not crm_date or not cal_date or crm_date != cal_date:
        return 0.0

    score = 0.0

    crm_mins = parse_crm_minutes(crm)
    cal_mins = parse_cal_minutes(cal)
    if crm_mins is not None and cal_mins is not None:
        diff = abs(crm_mins - cal_mins)
        if diff <= 90:
            score += 50 - (diff / 90) * 20
        elif diff <= 360:
            score += 10
        else:
            return 0.0

    has_client_match = client_in_attendees(crm, cal)
    if has_client_match:
        score += 60

    shared = key_words(crm.subject or "") & key_words(cal.title or "")
    has_title_overlap = bool(shared)
    if has_title_overlap:
        score += min(30, len(shared) * 10)

    all_firm = all("@firma.com" in a for a in cal.attendees if a)
    both_internal = crm.meeting_type == "Internal" and all_firm
    if both_internal:
        score += 20

    crm_loc = key_words(crm.location or "")
    cal_loc = key_words(cal.location or "")
    if crm_loc and cal_loc and (crm_loc & cal_loc):
        score += 10

    if not has_client_match and not has_title_overlap and not both_internal:
        return 0.0

    return score


def detect_conflicts(crm: CRMEvent, cal: CalendarEvent) -> list[Conflict]:
    conflicts = []

    cal_loc = (cal.location or "").lower()
    cal_is_virtual = any(kw in cal_loc for kw in ("zoom", "teams", "virtual", "https://"))

    if crm.meeting_type == "In-Person" and cal_is_virtual:
        conflicts.append(Conflict(
            field="meeting_modality",
            crm_value=f"In-Person @ {crm.location}",
            cal_value=f"Virtual link: {cal.location}",
            description="CRM records an In-Person meeting but the calendar has a virtual meeting link.",
            severity="high"
        ))

    crm_mins = parse_crm_minutes(crm)
    cal_mins = parse_cal_minutes(cal)
    if crm_mins is not None and cal_mins is not None:
        diff = abs(crm_mins - cal_mins)
        if diff > 30:
            if 240 <= diff <= 360 and is_utc(cal):
                conflicts.append(Conflict(
                    field="time",
                    crm_value=crm.meeting_time,
                    cal_value=cal.start_time,
                    description=f"Times differ by {diff} min — calendar uses UTC, CRM uses local time. Likely the same meeting.",
                    severity="low"
                ))
            else:
                conflicts.append(Conflict(
                    field="time",
                    crm_value=crm.meeting_time,
                    cal_value=cal.start_time,
                    description=f"Times differ by {diff} minutes.",
                    severity="high" if diff > 60 else "medium"
                ))

    crm_status = (crm.status or "").lower()
    cal_status = (cal.status or "").lower()
    if crm_status == "cancelled" and cal_status in ("confirmed", "tentative"):
        conflicts.append(Conflict(
            field="status",
            crm_value=crm.status,
            cal_value=cal.status,
            description="CRM marks this meeting as Cancelled but the calendar invite is still active.",
            severity="high"
        ))

    crm_loc = (crm.location or "").lower()
    if crm_loc and cal_loc and not cal_is_virtual:
        if similarity(crm_loc, cal_loc) < 0.4:
            conflicts.append(Conflict(
                field="location",
                crm_value=crm.location,
                cal_value=cal.location,
                description="Location descriptions differ significantly between sources.",
                severity="low"
            ))

    return conflicts


def crm_quality_issues(r: CRMEvent) -> list[str]:
    issues = []
    raw_date = r.meeting_date or ""
    if raw_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date):
        issues.append(f"Malformed date: '{raw_date}' — parsed as {parse_crm_date(r)}")
    if r.meeting_time is None:
        issues.append("Missing meeting time")
    if r.client_name is None and r.meeting_type != "Internal":
        issues.append("Missing client name on non-internal meeting")
    if not (r.notes or "").strip():
        issues.append("Empty notes field")
    return issues


def cal_quality_issues(r: CalendarEvent) -> list[str]:
    issues = []
    if not r.attendees:
        issues.append("No attendees listed")
    else:
        for a in r.attendees:
            if "[at]" in (a or ""):
                issues.append(f"Malformed email: '{a}'")
    if not r.location:
        issues.append("Missing location")
    if not r.description:
        issues.append("Missing description")
    return issues


def find_cal_duplicates(records: list[CalendarEvent]) -> dict[str, str]:
    dupes: dict[str, str] = {}
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            a, b = records[i], records[j]
            if a.event_id in dupes or b.event_id in dupes:
                continue
            if parse_cal_date(a) != parse_cal_date(b):
                continue
            t_a, t_b = parse_cal_minutes(a), parse_cal_minutes(b)
            if t_a is None or t_b is None or abs(t_a - t_b) > 90:
                continue
            atts_a = set(a.attendees)
            atts_b = set(b.attendees)
            overlap = atts_a & atts_b
            title_sim = similarity(a.title or "", b.title or "")
            if len(overlap) >= 1 and (title_sim > 0.25 or len(overlap) >= 2):
                dupe_id = b.event_id if (b.created_at or "") >= (a.created_at or "") else a.event_id
                primary_id = a.event_id if dupe_id == b.event_id else b.event_id
                dupes[dupe_id] = (
                    f"Likely duplicate of {primary_id} — same date, "
                    f"{abs(t_a - t_b)} min apart, {len(overlap)} shared attendee(s)"
                )
    return dupes


def reconcile() -> MeetingsResponse:
    crm_records, cal_records = load_data()

    matched: list[tuple[CRMEvent, CalendarEvent, list[Conflict]]] = []
    used_cal_ids: set[str] = set()
    unmatched_crm: list[CRMEvent] = []

    for crm in crm_records:
        best_score = 0.0
        best_cal = None
        for cal in cal_records:
            if cal.event_id in used_cal_ids:
                continue
            s = score_match(crm, cal)
            if s > best_score:
                best_score = s
                best_cal = cal

        if best_cal and best_score >= MATCH_THRESHOLD:
            conflicts = detect_conflicts(crm, best_cal)
            matched.append((crm, best_cal, conflicts))
            used_cal_ids.add(best_cal.event_id)
        else:
            unmatched_crm.append(crm)

    unmatched_cal = [c for c in cal_records if c.event_id not in used_cal_ids]

    cal_dupes_all = find_cal_duplicates(cal_records)
    cal_dupes = {
        k: v for k, v in cal_dupes_all.items()
        if k in {c.event_id for c in unmatched_cal}
    }

    meetings: list[ReconciledMeeting] = []

    for crm, cal, conflicts in matched:
        d = parse_crm_date(crm) or parse_cal_date(cal)
        meetings.append(ReconciledMeeting(
            id=f"{crm.crm_id}+{cal.event_id}",
            source="both",
            subject=crm.subject or cal.title,
            date=str(d) if d else None,
            time=crm.meeting_time or (cal.start_time or "")[:5],
            client_name=crm.client_name,
            client_company=crm.client_company,
            relationship_owner=crm.relationship_owner,
            meeting_type=crm.meeting_type,
            status=crm.status,
            location=crm.location or cal.location,
            attendees=cal.attendees,
            is_recurring=cal.is_recurring,
            conflicts=conflicts,
            data_quality=DataQualityIssues(
                crm=crm_quality_issues(crm),
                cal=cal_quality_issues(cal)
            ),
            crm_record=crm,
            cal_record=cal,
        ))

    for crm in unmatched_crm:
        d = parse_crm_date(crm)
        meetings.append(ReconciledMeeting(
            id=crm.crm_id,
            source="crm_only",
            subject=crm.subject,
            date=str(d) if d else None,
            time=crm.meeting_time,
            client_name=crm.client_name,
            client_company=crm.client_company,
            relationship_owner=crm.relationship_owner,
            meeting_type=crm.meeting_type,
            status=crm.status,
            location=crm.location,
            attendees=[],
            data_quality=DataQualityIssues(crm=crm_quality_issues(crm)),
            crm_record=crm,
        ))

    for cal in unmatched_cal:
        d = parse_cal_date(cal)
        is_dupe = cal.event_id in cal_dupes
        meetings.append(ReconciledMeeting(
            id=cal.event_id,
            source="cal_only",
            subject=cal.title,
            date=str(d) if d else None,
            time=(cal.start_time or "")[:5],
            relationship_owner=cal.organizer,
            status=cal.status,
            location=cal.location,
            attendees=cal.attendees,
            is_recurring=cal.is_recurring,
            data_quality=DataQualityIssues(cal=cal_quality_issues(cal)),
            is_duplicate=is_dupe,
            duplicate_reason=cal_dupes.get(cal.event_id),
            cal_record=cal,
        ))

    meetings.sort(key=lambda m: (m.date or "9999-99-99", m.time or "99:99"))

    summary = SummaryStats(
        total=len(meetings),
        matched=len(matched),
        crm_only=len(unmatched_crm),
        cal_only=len(unmatched_cal),
        with_conflicts=sum(1 for m in meetings if m.conflicts),
        with_data_issues=sum(1 for m in meetings if m.data_quality.crm or m.data_quality.cal),
        flagged_duplicates=len(cal_dupes),
    )

    return MeetingsResponse(meetings=meetings, summary=summary)