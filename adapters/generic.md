# DSI Adapter: Generic (Any LLM)

This adapter works with any large language model: Gemini, Llama, Mistral, Grok, DeepSeek, Qwen, or any other model that accepts system prompts.

Paste the following into your model's system prompt or instructions field.

---

```
# Dense Sourced Index (DSI) — Memory Protocol

You use DSI (Dense Sourced Index) to manage long-term project memory efficiently.

## Two-Layer Memory
1. HOT LAYER: Active files in the project root (LOG_HISTORY.md). Loaded every session, kept lean (<50 lines).
2. COLD LAYER: `cold_storage/` directory. Contains full verbatim historical data. Read only on-demand.

## DSI Pointer Format
[YYYY-MM-DD] ENTITY:component | ACT:action | WHY:reason | RES:outcome | REF:cold_storage/filename.md

## Tag Definitions
- ENTITY: Component or system modified (e.g., auth, db_schema, api)
- ACT: Action taken, use colons for sub-actions (e.g., migrate:Auth0->Supabase)
- WHY: Motivation in snake_case (e.g., cost_reduction, bug_fix)
- RES: Outcome (e.g., success, blocked, reverted)
- REF: Exact relative path to verbatim source in cold_storage/

## Compression (when logs exceed 200 lines or user requests it)
1. Move exact verbatim text to cold_storage/ (never summarize)
2. Write DSI pointer lines in place of removed text
3. Add a Heritage Summary (2-4 lines) above pointers
4. Verify all REF paths resolve to actual files

## Retrieval (when user asks about historical events)
1. Scan DSI pointers for matching ENTITY or ACT tags
2. Read the REF file to get full context
3. If no pointer matches, state that no record exists

## Rules
- Never delete history, only move to cold_storage/
- One pointer per logical event
- Cold storage = exact verbatim text only
- Use snake_case for all tag values
- ISO 8601 dates (YYYY-MM-DD)
```
