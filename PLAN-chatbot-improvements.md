# Plan: Improve Chatbot Response Quality & Security

## Context

The chatbot is hallucinating answers when asked questions outside its knowledge base. Example: when asked for "meme analogies about Gainers/Losers," it fabricated creative content, embedded a potentially hallucinated `<video>` tag, and ignored the "answer only from context" instruction. Root causes:

1. **No similarity threshold** — `match_document_chunks` returns similarity scores, but the Edge Function discards them (`.select('content')`), sending all 3 chunks regardless of relevance
2. **Weak system prompt** — the "only answer from context" rule is too easily bypassed by creative follow-up questions
3. **No output validation** — LLM can generate arbitrary HTML including fabricated `<video>` tags
4. **No frontend sanitization** — raw HTML rendered via `dangerouslySetInnerHTML` without DOMPurify (XSS risk)

## Changes

### 1. Edge Function: Similarity Threshold + Short-Circuit (Critical)

**File:** Supabase Edge Function `chat` (via MCP tools)

- Change `.select('content')` → `.select('content, similarity')`
- Add `CHUNK_SIMILARITY_THRESHOLD = 0.3` constant
- Filter chunks below threshold; if no relevant chunks remain, return "I don't have that information" (translated if needed) **without calling the LLM**
- Add a `translateToLanguage()` helper for the short-circuit response
- Log similarity scores for future threshold tuning

### 2. Edge Function: Strengthen System Prompt (Critical)

**File:** Same Edge Function, `SYSTEM_PROMPT` constant

Update RULE 2 to add:
- "Do NOT generate URLs, links, or references not present verbatim in the context"
- "Do NOT generate `<video>`, `<iframe>`, `<img>` tags unless they appear EXACTLY in the context"
- "Do NOT answer follow-up questions beyond the scope of the context (e.g., 'explain with memes', 'write a poem about it') — respond with 'I don't have that information'"
- Narrow HTML permission to only `<table>`, `<th>`, `<td>`, `<tr>`, `<code>`, `<pre>` tags

### 3. Edge Function: Server-Side Output Sanitization (Critical)

**File:** Same Edge Function

Add `sanitizeLlmOutput()` after LLM response:
- Strip `<script>` tags
- Validate `<video>` tags against those actually present in context chunks — strip fabricated ones
- Remove `on*` event handler attributes from any HTML
- Do NOT strip `<iframe>` tags — the frontend's `convertYouTubeVideos()` converts `<video>` YouTube tags into `<iframe>` embeds, so iframes must be allowed through

### 4. Edge Function: Prevent Hallucinated Cache Entries (Medium)

**File:** Same Edge Function, caching logic

Add `answerReferencesContext()` heuristic check — only cache answers where key terms overlap with context chunks. Prevents fabricated answers from being served to future users.

### 5. Frontend: Add DOMPurify (Critical)

**Files:**
- `package.json` — add `dompurify` + `@types/dompurify`
- `src/components/ChatMessage/ChatMessage.tsx` — sanitize HTML before `dangerouslySetInnerHTML`

Configure allowlist: `table`, `th`, `td`, `tr`, `code`, `pre`, `video`, `iframe`, `a`, `p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `h1-h6`, `div`, `span`, `hr`, `blockquote`. Strip everything else. This also protects `SharedConversationView` (uses same `ChatMessage` component).

### 6. Database: Add Threshold to RPC (Optional, defense-in-depth)

**Table function:** `match_document_chunks`

Add optional `similarity_threshold` parameter (default 0.0 for backward compatibility) to filter at the database level.

## Implementation Order

| # | Change | Layer |
|---|--------|-------|
| 1 | Similarity threshold + short-circuit | Edge Function |
| 2 | Strengthen system prompt | Edge Function |
| 3 | Output sanitization | Edge Function |
| 4 | Cache validation | Edge Function |
| 5 | Similarity score logging | Edge Function |
| 6 | DOMPurify sanitization | Frontend |
| 7 | RPC threshold parameter (optional) | Database |

Steps 1–5 deploy together as a single Edge Function update. Step 6 is a frontend change. Step 7 is an SQL migration.

## Verification

1. Deploy Edge Function → ask "Можешь навести якісь аналогії з відомим мемами" — should get "I don't have that information" (in Ukrainian)
2. Ask a legitimate question (e.g., "How to deposit crypto?") — should still get a grounded answer with correct video embeds
3. Check Supabase function logs for similarity score output
4. Inspect rendered HTML in browser DevTools — confirm no unsanitized tags
5. Test with `<script>alert(1)</script>` in a message to confirm DOMPurify blocks it
