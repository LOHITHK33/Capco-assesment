# Event Sync Service

A full-stack service that ingests meeting data from two upstream systems — a CRM and a Calendar — reconciles records that refer to the same real-world meeting, and serves a unified view through a REST API and React frontend.

---

## Tech Stack

- **Backend:** Python, FastAPI, Pydantic
- **Frontend:** React, TypeScript, Vite
- **Start:** Node.js + concurrently

---

## Prerequisites

- Python 3.12+ (3.14 works with latest packages)
- Node.js 18+
- npm 9+

---

## Setup

### 1. Install backend dependencies

```bash
cd backend
pip install -r requirement.txt
cd ..
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install root dependencies

```bash
npm install
```

---

## Running the App

From the root of the repository, run:

```bash
npm start
```

This starts both servers in a single terminal:

```
[BACKEND] INFO: Uvicorn running on http://127.0.0.1:8000
[FRONTEND] VITE ready in 300ms
[FRONTEND] ➜ Local: http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint             | Description                                |
| ------ | -------------------- | ------------------------------------------ |
| GET    | `/api/meetings`      | All reconciled meetings with summary stats |
| GET    | `/api/meetings/{id}` | Single meeting by ID                       |
| GET    | `/api/summary`       | Summary stats only                         |
| GET    | `/api/health`        | Health check                               |

Interactive API docs available at **http://localhost:8000/docs**

---

## Project Structure

```
Capco-assesment/
├── backend/
│   ├── data/
│   │   ├── crm_events.json
│   │   └── calendar_events.json
│   ├── main.py          # FastAPI routes
│   ├── models.py        # Pydantic schemas
│   ├── reconciler.py    # Core reconciliation engine
│   └── requirement.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── SummaryBar.tsx
│       │   ├── FilterBar.tsx
│       │   ├── MeetingCard.tsx
│       │   └── DetailPanel.tsx
│       ├── types/
│       │   └── index.ts
│       └── App.tsx
├── package.json         # Single command start
└── README.md
```

---

## Reconciliation Approach

The reconciler uses a **scoring function** to match CRM records against Calendar records. No shared IDs exist between sources, so matching is based on a combination of signals.

### Matching Signals

| Signal                                    | Points     |
| ----------------------------------------- | ---------- |
| Client last name found in attendee emails | +60        |
| Title word overlap (per shared word)      | +10 each   |
| Time within 90 minutes                    | +30 to +50 |
| Time within 6 hours (UTC offset cases)    | +10        |
| Both internal + all firma.com attendees   | +20        |
| Location token overlap                    | +10        |

A match is accepted if score >= 30. An **identity guard** requires at least one of: client match, title overlap, or both-internal — preventing false positives from time proximity alone.

### Data Issues Handled

| Issue                                      | Record   | Decision                                              |
| ------------------------------------------ | -------- | ----------------------------------------------------- |
| Malformed date `03-15/2025`                | CRM-1008 | Parsed with regex fallback                            |
| Missing meeting time                       | CRM-1007 | Matched on date + client signal                       |
| UTC vs local time mismatch                 | CAL-A4   | Flagged as low-severity conflict, not a match failure |
| CRM says In-Person, Calendar has Zoom link | CRM-1002 | Matched and flagged as high-severity conflict         |
| CRM Cancelled, Calendar Confirmed          | CRM-1009 | Matched and flagged as high-severity conflict         |
| Time differs by 2 hours                    | CRM-1016 | Matched and flagged as high-severity conflict         |
| Calendar duplicate (CAL-A5 / CAL-A6)       | CAL-A6   | Detected via cross-pool duplicate check and flagged   |
| Malformed attendee email                   | CAL-A16  | Flagged as data quality issue                         |
| Null client on non-internal meeting        | CRM-1006 | Flagged as data quality issue                         |

### Reconciliation Results

| Category                 | Count |
| ------------------------ | ----- |
| Total meetings           | 25    |
| Matched (both sources)   | 17    |
| CRM only                 | 3     |
| Calendar only            | 5     |
| With conflicts           | 4     |
| With data quality issues | 6     |
| Flagged duplicates       | 1     |

---

## Key Decisions

**Scoring over rules**
A rule-based approach ("if same date and same client then match") fails on messy real-world data. A scoring function handles partial matches, missing fields, and timezone differences more gracefully.

**Identity guard**
Date + time proximity alone is not enough to accept a match. Without at least one identity signal (client name in attendees, title overlap, or both-internal), the match is rejected. This prevented CRM-1003 (a client meeting at 15:00) from falsely matching an unrelated internal calendar block at 16:00 on the same day.

**UTC timezone handling**
CAL-A4 stores time as `2025-03-13T19:00:00Z` (UTC) while CRM-1004 records `14:00` local time — a 300-minute difference. Rather than treating this as a real conflict, the system detects the Z suffix and flags it as a likely timezone mismatch with low severity.

**Duplicate detection across all calendar records**
The initial approach only checked unmatched calendar records for duplicates. This missed CAL-A6 because CAL-A5 (its duplicate) had already been matched to a CRM record. Fixed by running duplicate detection across all calendar records first, then filtering to only flag unmatched ones.

**Conflict visibility**
Every matched meeting exposes both raw source records side by side in the UI. Conflicts are categorised by severity (high / medium / low) so a reviewer can immediately see what disagrees and make their own judgement.

**In-memory reconciliation**
Data is loaded and reconciled once at startup and cached in memory. For this scale (42 records), a database adds complexity without benefit. A note for production: this would need a proper store with incremental sync.

---

## What I Would Do With More Time

- Add a database layer (SQLite or PostgreSQL) with incremental sync instead of full reload
- Add a manual override UI — let users resolve conflicts and mark a canonical value
- Write unit tests for the reconciler, especially edge cases in date parsing and scoring
- Add pagination to the API for larger datasets
- Improve timezone handling to auto-convert UTC calendar times to local time before comparison

---

## Time Spent

**~2 hours 25 minutes**

| Phase                                 | Time   |
| ------------------------------------- | ------ |
| Data analysis + architecture planning | 20 min |
| Backend (models, reconciler, API)     | 65 min |
| Frontend (components, types, CSS)     | 45 min |
| Single command start + git cleanup    | 15 min |
