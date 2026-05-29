# Event Sync Service

A full-stack service that ingests meeting data from two upstream systems — a CRM and a Calendar — reconciles records that refer to the same real-world meeting, and serves a unified view through a REST API and React frontend.

---

## Tech Stack

- **Backend:** Python, FastAPI, Pydantic
- **Frontend:** React, TypeScript, Vite
- **Start:** Node.js (built-in only, no global installs needed)

---

## Prerequisites

Before running, make sure you have:

- **Python 3.12+** (Python 3.14 works) — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **pip** (comes with Python)

---

## Quick Start

Clone the repository and run a single command from the root:

```bash
npm start
```

This will automatically:

1. Install all Python backend dependencies
2. Install all frontend Node dependencies
3. Start the backend API on **http://localhost:8000**
4. Start the frontend on **http://localhost:5173**

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
│   │   ├── crm_events.json       # CRM source data
│   │   └── calendar_events.json  # Calendar source data
│   ├── main.py                   # FastAPI routes
│   ├── models.py                 # Pydantic schemas
│   ├── reconciler.py             # Core reconciliation engine
│   └── requirement.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── SummaryBar.tsx    # Stats overview
│       │   ├── FilterBar.tsx     # Filter controls
│       │   ├── MeetingCard.tsx   # Meeting row with expand
│       │   └── DetailPanel.tsx   # Side-by-side source view
│       ├── types/
│       │   └── index.ts          # TypeScript interfaces
│       └── App.tsx
├── setup.js                      # Auto-install + start script
├── package.json
└── README.md
```

---

## What the Frontend Shows

- **Summary bar** — total meetings, matched, CRM only, calendar only, conflicts, data issues, duplicates
- **Filter bar** — filter meetings by source or flag type
- **Meeting cards** — click any card to expand and see both raw source records side by side
- **Conflict highlighting** — conflicts shown with severity (high / medium / low) and a description
- **Data quality flags** — missing fields, malformed values, and duplicate records are clearly labelled

---

## Reconciliation Approach

The reconciler uses a **scoring function** to match CRM records against Calendar records. No shared IDs exist between sources, so matching relies on a combination of signals.

### Matching Signals

| Signal                                          | Points     |
| ----------------------------------------------- | ---------- |
| Client last name found in attendee emails       | +60        |
| Title word overlap (per shared meaningful word) | +10 each   |
| Time within 90 minutes                          | +30 to +50 |
| Time within 6 hours (UTC offset cases)          | +10        |
| Both internal + all firma.com attendees         | +20        |
| Location token overlap                          | +10        |

A match is accepted at **score >= 30**. An identity guard requires at least one strong signal beyond date and time — preventing false positives where two unrelated meetings happen to be on the same day close in time.

### Data Issues Handled

| Issue                                        | Record   | Decision                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------ |
| Malformed date `03-15/2025`                  | CRM-1008 | Parsed with regex fallback, flagged as data quality issue    |
| Missing meeting time                         | CRM-1007 | Matched on date and client signal alone                      |
| UTC vs local time mismatch                   | CAL-A4   | 300-min gap detected as timezone issue, flagged low severity |
| CRM says In-Person, Calendar shows Zoom link | CRM-1002 | Matched, flagged as high-severity modality conflict          |
| CRM Cancelled, Calendar Confirmed            | CRM-1009 | Matched, flagged as high-severity status conflict            |
| Times differ by 2 hours                      | CRM-1016 | Matched, flagged as high-severity time conflict              |
| Calendar duplicate (CAL-A5 / CAL-A6)         | CAL-A6   | Detected via cross-pool duplicate check and flagged          |
| Malformed attendee email `[at]`              | CAL-A16  | Flagged as data quality issue                                |
| Null client on non-internal meeting          | CRM-1006 | Flagged as data quality issue                                |
| Empty notes field                            | CRM-1010 | Flagged as data quality issue                                |

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
A rule-based approach fails on messy real-world data. A scoring function handles partial matches, missing fields, and timezone differences more gracefully and produces explainable results.

**Identity guard**
Date and time proximity alone is not enough to accept a match. Without at least one identity signal (client name in attendees, title word overlap, or both-internal meeting), the match is rejected. This prevented CRM-1003 (a client meeting at 15:00) from falsely matching an unrelated internal calendar block at 16:00 on the same day.

**UTC timezone handling**
CAL-A4 stores time as `2025-03-13T19:00:00Z` (UTC) while CRM-1004 records `14:00` local time — a 300-minute difference. The system detects the Z suffix and flags it as a likely timezone mismatch with low severity rather than a real scheduling conflict.

**Duplicate detection across all calendar records**
The initial approach only checked unmatched calendar records for duplicates. This missed CAL-A6 because CAL-A5 had already been matched to a CRM record. Fixed by running duplicate detection across all calendar records first, then filtering to only flag records that ended up unmatched.

**Conflict visibility over silent resolution**
When two sources disagree, the service surfaces the conflict with context rather than silently picking one value. A sales team needs to know when their CRM says In-Person but the calendar invite is a Zoom link — that is actionable information.

**In-memory reconciliation**
Data is loaded and reconciled once at startup and cached in memory. For this scale (42 records total), a database adds complexity without benefit. In production this would need a proper store with incremental sync.

**Source records preserved**
Every reconciled meeting carries the full raw CRM and Calendar records. The frontend uses this to show both sources side by side so the user always knows where each piece of data came from.

---

## What I Would Do With More Time

- Add a database layer (SQLite or PostgreSQL) with incremental sync instead of full reload on startup
- Add a manual override UI — let users resolve conflicts and mark a canonical value per field
- Write unit tests for the reconciler, especially the date parsing fallback and scoring edge cases
- Add pagination to the API for larger datasets
- Improve timezone handling to auto-convert UTC calendar times to local time before comparison
- Add a confidence score to each match so the UI can surface low-confidence matches for human review

---

## AI Collaboration

See [AI_COLLABORATION.md](./AI_COLLABORATION.md) for a full account of how AI was used during this project.

---

## Time Spent

**~2 hours 25 minutes**

| Phase                                    | Time   |
| ---------------------------------------- | ------ |
| Data analysis and architecture planning  | 20 min |
| Backend — models, reconciler, API routes | 65 min |
| Frontend — components, types, CSS        | 45 min |
| Single command start and git cleanup     | 15 min |
