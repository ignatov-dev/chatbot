# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server on :5175
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build
npm run ingest     # Ingest default doc (deposit-and-withdrawals.txt)
npm run reingest   # Force re-ingest all documents
node scripts/ingest.mjs -- <filename.txt>  # Ingest a specific file from docs/
```

No test framework is configured.

## Environment

Copy `.env.example` to `.env` and fill in Supabase credentials. The GROQ_API_KEY is only needed in the Supabase Edge Function runtime (set via `npx supabase secrets set`), not locally.

Frontend env vars use the `VITE_` prefix (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Architecture

**RAG chatbot** — users ask questions, the system retrieves relevant document chunks via vector search, and an LLM generates answers grounded in those chunks.

### Stack

- **Frontend:** React 19 + TypeScript + Vite (no router — single-page, state-driven navigation)
- **Backend:** Supabase (Auth, Postgres, Edge Functions)
- **LLM:** Groq API called from Supabase Edge Function (`/functions/v1/chat`)
- **Embeddings:** Generated via Supabase Edge Function (`/functions/v1/embed`)
- **Styling:** Inline CSS (no framework), purple accent (#4f2dd0)

### Data Flow

1. User sends message → `services/chat.ts` calls Supabase Edge Function with question + source theme
2. Edge Function performs vector search on `document_chunks`, builds prompt with context, calls Groq LLM
3. Response returned and saved to `messages` table via `services/conversations.ts`

### Key Source Layout

- `src/components/` — UI components (AuthForm, ChatWindow, ChatInput, ChatMessage, ConversationSidebar)
- `src/contexts/AuthContext.tsx` — Supabase auth state provider wrapping the app
- `src/services/chat.ts` — `askClaude()` function that calls the chat Edge Function
- `src/services/conversations.ts` — CRUD for conversations and messages tables
- `src/lib/supabase.ts` — Supabase client initialization
- `scripts/ingest.mjs` — Document ingestion pipeline: reads files from `docs/`, chunks by `===SECTION: NAME===` delimiters, generates embeddings, stores in `document_chunks` table

### Database Tables

- `conversations` — id, title, source, user_id, updated_at
- `messages` — id, conversation_id, role, content, created_at
- `document_chunks` — id, source, chunk_index, content, embedding

### Theme System

"Themes" (CryptoPayX, Deposit & Withdrawal) map to different document sources. Switching themes resets the active conversation and queries different chunks.

### Supabase Edge Functions

Edge Functions are **not** stored in this repo — they are deployed on Supabase. Use the **Supabase MCP tools** to read and update them:

- `mcp__supabase__list_edge_functions` — list all functions
- `mcp__supabase__get_edge_function` — read a function's code (pass `function_slug`, e.g. `"chat"`)
- `mcp__supabase__deploy_edge_function` — deploy/update a function

The `chat` Edge Function (`slug: "chat"`, `verify_jwt: false`) handles:
- Language detection & translation (Groq)
- Vector similarity search on `document_chunks`
- Semantic question cache (`question_cache` table)
- LLM prompt construction with system prompt + context chunks + history
- Response parsing (OPTIONS extraction for clarification flows)

When modifying the Edge Function, always read the current version first with `get_edge_function`, make changes, then deploy the full file.
