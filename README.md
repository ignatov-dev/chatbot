# XBO Chatbot

A RAG-powered (Retrieval-Augmented Generation) support chatbot for XBO. Users ask questions and the system retrieves relevant document chunks via vector search, then an LLM generates answers grounded in those chunks.

## Demo

https://github.com/ignatov-dev/chatbot/blob/main/public/xbo-presentation-hq.mp4

## Tech Stack

| Layer       | Technology                                     |
| ----------- | ---------------------------------------------- |
| Frontend    | React 19, TypeScript, Vite                     |
| Backend     | Supabase (Auth, Postgres, Edge Functions)      |
| LLM         | Groq API (via Supabase Edge Function)          |
| Embeddings  | Supabase Edge Function (`/functions/v1/embed`) |
| Animations  | Framer Motion                                  |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the required tables and Edge Functions deployed
- A [Groq](https://console.groq.com) API key

### Installation

```bash
git clone <repo-url>
cd chatbot
npm install
```

### Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

| Variable                    | Where it's used       | Description                        |
| --------------------------- | --------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`        | Frontend (Vite)       | Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY`   | Frontend (Vite)       | Supabase anonymous/public key      |
| `SUPABASE_URL`              | Ingestion script      | Supabase project URL               |
| `SUPABASE_SERVICE_ROLE_KEY` | Ingestion script      | Supabase service role key          |
| `GROQ_API_KEY`              | Edge Function runtime | Set via `npx supabase secrets set` |

> **Note:** `GROQ_API_KEY` is only needed in the Supabase Edge Function runtime, not locally.

### Running Locally

```bash
npm run dev
```

Opens the app at [http://localhost:5175](http://localhost:5175).

## Scripts

| Command                                  | Description                         |
| ---------------------------------------- | ----------------------------------- |
| `npm run dev`                            | Start Vite dev server on port 5175  |
| `npm run build`                          | TypeScript check + production build |
| `npm run preview`                        | Preview the production build        |
| `npm run ingest`                         | Ingest the default document         |
| `npm run reingest`                       | Force re-ingest all documents       |
| `node scripts/ingest.mjs -- <file.txt>` | Ingest a specific file from `docs/` |

## Architecture

### Data Flow

```
User sends message
  → Frontend calls Supabase Edge Function (chat)
    → Vector similarity search on document_chunks
    → Builds prompt with matched context + conversation history
    → Calls Groq LLM
  ← Structured response returned to frontend
  → Message persisted to messages table
```

### Project Structure

```
src/
├── components/
│   ├── AuthForm/
│   │   ├── AuthForm.tsx           # Sign-in / sign-up form
│   │   ├── AuthForm.module.css
│   │   └── index.ts
│   ├── ChatInput/
│   │   ├── ChatInput.tsx          # Message input bar
│   │   ├── ChatInput.module.css
│   │   └── index.ts
│   ├── ChatMessage/
│   │   ├── ChatMessage.tsx        # Individual message bubble
│   │   ├── ChatMessage.module.css
│   │   └── index.ts
│   ├── ChatWindow/
│   │   ├── ChatWindow.tsx         # Message list display
│   │   ├── ChatWindow.module.css
│   │   └── index.ts
│   └── ConversationSidebar/
│       ├── ConversationSidebar.tsx # Conversation history sidebar
│       ├── ConversationSidebar.module.css
│       └── index.ts
├── contexts/
│   └── AuthContext.tsx             # Supabase auth state provider
├── services/
│   ├── chat.ts                    # askClaude() — calls the chat Edge Function
│   └── conversations.ts           # CRUD for conversations & messages
├── lib/
│   └── supabase.ts                # Supabase client initialization
├── App.tsx                        # Root component, theme & conversation management
└── main.tsx                       # Entry point

scripts/
└── ingest.mjs                     # Document ingestion pipeline

docs/                              # Source documents for RAG knowledge base
```

### Database Tables

| Table             | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `conversations`   | Conversation metadata (title, source, user)      |
| `messages`        | Chat messages (role, content, conversation ref)   |
| `document_chunks` | Ingested document chunks with vector embeddings  |
| `question_cache`  | Semantic cache for repeated questions            |

### Theme System

The app organizes knowledge into themes, each mapped to a different document source:

- **CryptoPayX** — API documentation
- **Deposit & Withdrawal** — deposit/withdrawal guides
- **Verification** — identity verification procedures
- **Loyalty Program** — loyalty program details

Switching themes resets the active conversation and queries the corresponding document chunks.

## Document Ingestion

Source documents live in `docs/` and use `===SECTION: NAME===` delimiters to define chunk boundaries. The ingestion script:

1. Reads files from `docs/`
2. Splits content by section delimiters
3. Generates embeddings via the Supabase `embed` Edge Function
4. Stores chunks and embeddings in the `document_chunks` table

```bash
# Ingest all documents (force re-ingest)
npm run reingest

# Ingest a specific document
node scripts/ingest.mjs -- verification.txt
```

## Supabase Edge Functions

Edge Functions are deployed on Supabase (not stored in this repo). The main function is **`chat`**, which handles:

- Language detection and translation
- Vector similarity search on `document_chunks`
- Semantic question caching via `question_cache`
- LLM prompt construction with system prompt, context chunks, and conversation history
- Response parsing with optional clarification options
