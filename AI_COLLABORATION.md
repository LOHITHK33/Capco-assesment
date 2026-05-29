# AI Collaboration Log

This document outlines how AI assistance was used during the development of the Event Sync Service. The assessment explicitly encourages AI usage and transparency around it.

---

## How AI Was Used

AI was used as a collaborative tool throughout the project — not to generate code blindly, but to reason through decisions, catch issues early, and move faster on boilerplate so more time could be spent on the logic that actually matters.

---

## Phase 1 — Data Analysis

Before writing any code, AI was used to systematically analyse both JSON files and catalogue every data quality issue.

The prompt was essentially: _go through both files and find every anomaly — malformed fields, missing values, cross-source conflicts, and duplicates._

This produced a structured table of issues:

| Issue                                    | Record             |
| ---------------------------------------- | ------------------ |
| Malformed date `03-15/2025`              | CRM-1008           |
| Missing meeting time                     | CRM-1007           |
| Null client on non-internal meeting      | CRM-1006           |
| UTC vs local time mismatch               | CAL-A4             |
| Modality conflict (In-Person vs Zoom)    | CRM-1002 / CAL-A2  |
| Status conflict (Cancelled vs Confirmed) | CRM-1009 / CAL-A10 |
| Time conflict (2 hours apart)            | CRM-1016 / CAL-A17 |
| Calendar duplicate                       | CAL-A5 / CAL-A6    |
| Malformed attendee email `[at]`          | CAL-A16            |

Doing this manually before writing the reconciler meant the logic was designed to handle known issues rather than discovering them after the fact.

---

## Phase 2 — Architecture Planning

AI was used to think through the architecture before scaffolding anything.

Key questions discussed:

- Should matching use rules or scoring? Scoring won because rules break on partial data.
- What signals are strong enough to confirm a match? Client name in attendees, title word overlap, internal-meeting heuristic.
- What prevents false positives? An identity guard that rejects matches based on time proximity alone.
- How should conflicts be surfaced? Categorised by severity with both raw values shown, not silently resolved.

The architecture plan produced was:

```
models.py       → Pydantic schemas (data contract)
reconciler.py   → scoring, conflict detection, duplicate detection
main.py         → thin FastAPI routes, calls reconciler
frontend/       → React components reading from API
```

---

## Phase 3 — Backend Development

AI assisted with:

- Writing the Pydantic models for `CRMEvent`, `CalendarEvent`, `ReconciledMeeting`, `Conflict`, and `SummaryStats`
- Implementing the scoring function with appropriate weights per signal
- Writing the date parsing fallback for the malformed `03-15/2025` format
- Detecting the UTC timezone case and classifying it as low-severity rather than a real conflict
- Fixing a bug where duplicate detection missed CAL-A6 because CAL-A5 had already been matched

The duplicate detection bug is worth noting specifically. The initial implementation ran `find_cal_duplicates` only on unmatched calendar records. This meant CAL-A6 was never compared against CAL-A5 because CAL-A5 was in the matched pool. AI identified this during a debug session and the fix was to run duplicate detection across all calendar records first, then filter to only flag unmatched ones.

---

## Phase 4 — Frontend Development

AI assisted with:

- Defining the TypeScript interfaces to mirror the Pydantic models
- Building the component structure: `SummaryBar`, `FilterBar`, `MeetingCard`, `DetailPanel`
- Writing the global CSS with class-based styling instead of inline styles
- Fixing a TypeScript error where `SummaryBar` was receiving `FilterBar` props by mistake
- Enforcing strict TypeScript — no `any`, `import type` for type-only imports, no unused variables

---

## Phase 5 — Debugging

Several issues were debugged collaboratively:

**False positive match (CRM-1003 + CAL-A7)**
CRM-1003 (Rachel Torres, 15:00) was matching CAL-A7 (Internal Pipeline Review, 16:00) purely on time proximity. The fix was adding an identity guard: if there is no client match, no title overlap, and neither side is internal, reject the match regardless of score.

**Python 3.14 compatibility**
The pinned `pydantic==2.7.1` had no pre-built wheel for Python 3.14 and required Rust compilation which failed without MSVC. The fix was upgrading to the latest pydantic which ships `cp314` wheels.

**Single command start**
Several approaches were tried before landing on `setup.js` — a plain Node.js script using only built-in `child_process` and `path` modules. This means the reviewer only needs Node.js installed — no global `npm install` required before running `npm start`.

---

## What AI Did Not Do

- AI did not make decisions autonomously. Every architectural choice was reasoned through and confirmed before implementation.
- AI did not write the README or this document from a blank slate — both were drafted based on the actual decisions made during the build.
- AI did not determine the reconciliation results. The output of `total=25, matched=17, crm_only=3, cal_only=5` came from running the actual code against the actual data and verifying each match manually.

---

## Summary

AI assistance made it possible to complete a well-reasoned implementation in ~2.5 hours by:

- Eliminating time spent on boilerplate
- Catching logic bugs early through collaborative debugging
- Keeping the focus on the decisions that matter — matching strategy, conflict handling, data quality — rather than syntax and setup
