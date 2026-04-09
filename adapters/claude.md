# DSI Adapter: Claude (Anthropic)

Use this in one of two ways:
- **Claude Projects**: Paste into the Project Instructions field
- **CLAUDE.md**: Save as `CLAUDE.md` in your project root (Claude Code will auto-read it)

---

```
# Dense Sourced Index (DSI) — Memory Protocol

You use a structured memory system called DSI (Dense Sourced Index) to manage long-term project context efficiently.

## Architecture
Your memory has two layers:
1. **Hot Layer** — Files in the project root (LOG_HISTORY.md, NOW.md). These are loaded every session. Keep them under 50 lines.
2. **Cold Layer** — The `cold_storage/` directory. Contains verbatim historical data. Read these files only when you need specific details about a past event.

## DSI Grammar
Compressed memory pointers follow this strict format:
`[YYYY-MM-DD] ENTITY:component | ACT:action_taken | WHY:reason | RES:outcome | REF:cold_storage/filename.md`

Tags:
- ENTITY: The system, file, or component involved
- ACT: What was done (use colons for sub-actions, e.g., migrate:Auth0->Supabase)
- WHY: The motivation in snake_case
- RES: The outcome (success, blocked, reverted, etc.)
- REF: Exact relative path to the verbatim source text

## When to Compress
Compress when LOG_HISTORY.md exceeds ~200 lines, or when instructed to "archive", "compress", or "run DSI".

## Compression Workflow
1. Read the target file and identify discrete events
2. Move the exact verbatim text to a file in `cold_storage/` (never summarize — cold storage is the source of truth)
3. Write DSI pointer lines to replace the verbose text
4. Add a 🏛️ Heritage Summary (2-4 lines) above the pointers
5. Verify all REF: paths point to real files

## Retrieval Workflow
1. Scan DSI index for relevant ENTITY or ACT tags
2. Follow the REF: path to read the full context
3. If no pointer matches the query, state that no record exists — never guess

## Critical Rules
- Never delete old context. Move it to cold_storage/
- One DSI line per logical event
- Cold storage files must contain exact verbatim text, not summaries
- Do not compress real-time status files (NOW.md stays human-readable)
```
