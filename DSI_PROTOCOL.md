# DSI Protocol: Dense Sourced Index

> The complete specification for LLM-native, zero-infrastructure memory management.

## 1. Hot/Cold Context Separation

Active context costs tokens. Archived context saves tokens.

Every project that uses DSI maintains two layers:

- **Hot Layer (Active Context):** The files that are loaded into the LLM's context window every session. These must be kept as lean as possible. Examples: `LOG_HISTORY.md`, `README.md`, `NOW.md`.
- **Cold Layer (On-Demand Archive):** A folder named `cold_storage/` in the project root. Verbatim long-form text is stored here. The LLM never reads these files unless it explicitly decides to by following a `REF:` pointer.

### Rules:
1. **Never delete old context.** Always move it to `cold_storage/`. History is sacred.
2. **Never summarize into cold storage.** Cold storage contains the exact, unedited, verbatim original text. Summaries go in the hot layer.
3. **Always leave a pointer.** When text is moved to cold storage, a DSI index line must be left in its place in the hot file.

---

## 2. DSI Grammar Standard

DSI compresses verbose, narrative-style logs into strict, machine-readable index lines. This drastically reduces token consumption while preserving perfect retrievability.

### Format:
```
[YYYY-MM-DD] ENTITY:name | ACT:action | WHY:reason | RES:outcome | REF:filepath
```

### Tag Dictionary:

| Tag | Required | Description | Examples |
|-----|----------|-------------|----------|
| `ENTITY` | ✅ | The main component, file, or system modified | `auth.ts`, `db_schema`, `landing_page`, `CI_pipeline` |
| `ACT` | ✅ | The specific technical action taken | `migrate:Auth0->Supabase`, `add:webhook`, `fix:cors_headers` |
| `WHY` | ✅ | The short reason or motivation | `cost_reduction`, `client_request`, `bug_342`, `perf_optimization` |
| `RES` | ✅ | The outcome or current status | `success`, `partial_blocked_by_api`, `reverted`, `pending_review` |
| `REF` | ✅ | The exact relative path to the verbatim source | `cold_storage/log_archive_jan.md`, `cold_storage/meeting_q1.md` |

### Compression Rules:
1. Strip all narrative syntax, transition words, and complete sentences.
2. Use `snake_case` for all tag values.
3. Use `:` to separate sub-actions (e.g., `ACT:migrate:Auth0->Supabase`).
4. One DSI line per logical event. Do not combine unrelated events.
5. Timestamps must be ISO 8601 date format (`YYYY-MM-DD`).

---

## 3. Heritage Block Convention

When compressing a large section of history, always leave a **Heritage Summary** above the DSI index. This is a 2-4 line, human-readable paragraph that gives the LLM enough ancestral context to understand the broad arc of the project without needing to open any cold storage files.

### Format:
```markdown
### 🏛️ Heritage Summary
[2-4 lines describing the high-level arc of the archived period.
What was built, what major decisions were made, what the current state evolved from.]

### 🗜️ DSI Archive Index
[DSI pointer lines here]
```

### Example:
```markdown
### 🏛️ Heritage Summary
Initial platform built on Next.js 14 with Supabase Auth. Migrated from Auth0 in January
due to B2B pricing concerns. Database expanded in February with enterprise tier columns
and FTA rate tables. Core calculator engine handles CIF, PPN, PPh22 computations.

### 🗜️ DSI Archive Index
[2024-01-14] ENTITY:auth | ACT:migrate:Auth0->Supabase | WHY:cost_scaling_b2b | RES:success_bill=0 | REF:cold_storage/archive_jan.md
[2024-02-05] ENTITY:db_schema | ACT:add:enterprise_columns | WHY:tier_support | RES:success_migrated | REF:cold_storage/archive_feb.md
```

---

## 4. Compression Workflow

When instructed to compress context (or when a log file exceeds ~200 lines), follow these exact steps:

1. **Analyze:** Read the target text and identify discrete logical events (each `### DATE:` block, each meeting section, etc.).
2. **Move:** Create or append to a file in `cold_storage/` with the exact, unedited raw text. Use descriptive filenames (e.g., `log_archive_2024_jan.md`, `meeting_notes_kickoff.md`).
3. **Compress:** Convert each logical event from the raw text into a single DSI index line following the grammar standard.
4. **Summarize:** Write a 2-4 line Heritage Summary capturing the high-level arc of the archived content.
5. **Replace:** Remove the verbose text from the hot file and insert the Heritage Summary + DSI index in its place.
6. **Verify:** Ensure every `REF:` tag correctly points to an existing file path.

---

## 5. Retrieval Workflow

When the LLM encounters a DSI index and needs detailed information:

1. **Scan** the DSI index lines in the hot file for relevant `ENTITY:` or `ACT:` tags.
2. **Identify** the matching `REF:` path.
3. **Read** the referenced cold storage file to retrieve the full verbatim context.
4. **Answer** the user's question using the retrieved ground truth.
5. **Do not guess.** If no DSI pointer matches the user's query, explicitly state that no historical record exists for that topic.

---

## 6. Anti-Patterns (What NOT To Do)

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Summarize text when moving to cold storage | Move the exact verbatim text — cold storage is the source of truth |
| Delete old logs to "save space" | Compress to DSI pointers — never delete history |
| Combine unrelated events into one DSI line | One line per logical event, even if they happened on the same day |
| Use vague `REF:` paths like `cold_storage/old.md` | Use descriptive filenames: `cold_storage/auth_migration_jan.md` |
| Apply DSI to real-time status files (e.g., `NOW.md`) | Only compress historical/archival content — active state must remain human-readable |
