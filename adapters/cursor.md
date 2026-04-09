# DSI Adapter: Cursor IDE

Paste the following into your `.cursorrules` file at the project root.

---

```
# Dense Sourced Index (DSI) — Memory Protocol

You have access to a structured memory system called DSI (Dense Sourced Index). Follow these rules strictly.

## Memory Architecture
- **Hot Layer**: Files in the project root (like LOG_HISTORY.md) are your active memory. Keep them lean.
- **Cold Layer**: The `cold_storage/` directory contains verbatim historical data. Only read these files when you need specific details.

## Reading DSI Indexes
When you see lines formatted as:
`[DATE] ENTITY:x | ACT:y | WHY:z | RES:w | REF:filepath`

This is a compressed pointer. The `REF:` path contains the full, unedited original text. Read it only when the user asks about that specific topic.

## Writing DSI Indexes
When a log file exceeds ~200 lines, or when the user says "compress", "archive", or "run DSI":
1. Move the verbose text to `cold_storage/` (exact verbatim copy, never summarize)
2. Replace it with DSI pointer lines using this format:
   `[YYYY-MM-DD] ENTITY:component | ACT:action | WHY:reason | RES:outcome | REF:cold_storage/filename.md`
3. Add a Heritage Summary (2-4 lines) above the pointers describing the high-level arc
4. Never delete historical content — always preserve in cold storage

## Rules
- One DSI line per logical event
- Use snake_case for tag values
- Timestamps must be ISO 8601 (YYYY-MM-DD)
- If no DSI pointer matches a query, say so — never hallucinate history
```
