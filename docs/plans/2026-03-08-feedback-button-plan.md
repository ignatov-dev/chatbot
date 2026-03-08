# Feedback Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a floating feedback button that lets users rate the chatbot (1-5 stars) and leave a message, saved to Supabase and forwarded to Slack.

**Architecture:** New `user_feedback` DB table + new `feedback` Supabase Edge Function (handles insert + Slack webhook) + frontend component (floating button + modal popup) + service layer calling the edge function.

**Tech Stack:** React 19, TypeScript, CSS Modules, Supabase (Postgres + Edge Functions + RLS), Slack Incoming Webhook

---

### Task 1: Create `user_feedback` database table and RLS policy

**Files:**
- Supabase migration (via MCP `apply_migration`)

**Step 1: Apply migration**

Use `mcp__supabase__apply_migration` with name `create_user_feedback_table` and this SQL:

```sql
create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

create policy "Users can insert own feedback"
  on public.user_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.user_feedback for select
  to authenticated
  using (auth.uid() = user_id);
```

**Step 2: Verify table exists**

Use `mcp__supabase__list_tables` to confirm `user_feedback` appears.

---

### Task 2: Create `feedback` Supabase Edge Function

**Files:**
- Supabase Edge Function `feedback` (via MCP `deploy_edge_function`)

**Step 1: Read existing edge function pattern**

Use `mcp__supabase__get_edge_function` with `function_slug: "chat"` to see the import/auth pattern used in the project.

**Step 2: Deploy the `feedback` edge function**

Use `mcp__supabase__deploy_edge_function` with slug `feedback` and `verify_jwt: false` (we authenticate via the Supabase client token in the Authorization header, same pattern as `chat`).

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rating, message } = await req.json();

    if (!rating || !message || typeof rating !== "number" || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into DB
    const { error: insertError } = await supabase
      .from("user_feedback")
      .insert({ user_id: user.id, rating, message });

    if (insertError) {
      throw insertError;
    }

    // Send to Slack
    const slackWebhookUrl = Deno.env.get("SLACK_FEEDBACK_WEBHOOK_URL");
    if (slackWebhookUrl) {
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      const slackPayload = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "💬 New Chatbot Feedback", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*User:*\n${user.email}` },
              { type: "mrkdwn", text: `*Rating:*\n${stars} (${rating}/5)` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Message:*\n${message}` },
          },
        ],
      };

      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Step 3: Set the Slack webhook secret**

Ask the user for their `SLACK_FEEDBACK_WEBHOOK_URL` and set it via Supabase CLI or dashboard.

---

### Task 3: Create frontend service `src/services/userFeedback.ts`

**Files:**
- Create: `src/services/userFeedback.ts`

**Step 1: Create the service file**

```typescript
import { supabase } from '../lib/supabase'

export async function submitFeedback(rating: number, message: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feedback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ rating, message }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to submit feedback')
  }
}
```

---

### Task 4: Create `FeedbackButton` component (CSS Module)

**Files:**
- Create: `src/components/FeedbackButton/FeedbackButton.module.css`

**Step 1: Create the CSS module**

```css
.floatingBtn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #4f2dd0;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(79, 45, 208, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.floatingBtn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(79, 45, 208, 0.45);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

.stars {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.star {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #d1d5db;
  transition: color 100ms ease, transform 100ms ease;
}

.star:hover {
  transform: scale(1.15);
}

.starActive {
  color: #f59e0b;
}

.textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 150ms ease;
}

.textarea:focus {
  border-color: #4f2dd0;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.cancelBtn {
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
}

.cancelBtn:hover {
  background: #f3f4f6;
}

.submitBtn {
  padding: 8px 16px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  background: #4f2dd0;
  color: #ffffff;
  cursor: pointer;
  transition: background 120ms ease;
}

.submitBtn:hover {
  background: #3f22a8;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .floatingBtn {
    bottom: calc(16px + env(safe-area-inset-bottom));
    right: 16px;
  }

  .overlay {
    align-items: flex-end;
  }

  .dialog {
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  }

  .actions {
    flex-direction: column;
  }

  .cancelBtn,
  .submitBtn {
    width: 100%;
    padding: 12px;
    font-size: 15px;
    border-radius: 10px;
  }

  .submitBtn {
    order: -1;
  }
}
```

---

### Task 5: Create `FeedbackButton` component (TSX)

**Files:**
- Create: `src/components/FeedbackButton/FeedbackButton.tsx`
- Create: `src/components/FeedbackButton/index.ts`

**Step 1: Create the component**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { submitFeedback } from '../../services/userFeedback'
import Tooltip from '../Tooltip'
import styles from './FeedbackButton.module.css'

export default function FeedbackButton({ onToast }: { onToast: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const reset = useCallback(() => {
    setRating(0)
    setHoverRating(0)
    setMessage('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || !message.trim()) return
    setSubmitting(true)
    try {
      await submitFeedback(rating, message.trim())
      setOpen(false)
      reset()
      onToast('Thanks for your feedback!')
    } catch {
      onToast('Failed to send feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [rating, message, reset, onToast])

  return (
    <>
      <Tooltip text="Leave feedback">
        <button
          className={styles.floatingBtn}
          onClick={() => setOpen(true)}
          aria-label="Leave feedback"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </Tooltip>

      {open && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div className={styles.dialog}>
            <div className={styles.title}>How's your experience?</div>
            <div className={styles.subtitle}>Your feedback helps us improve the chatbot.</div>

            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`${styles.star} ${n <= (hoverRating || rating) ? styles.starActive : ''}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Tell us what you think..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
            />

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => { setOpen(false); reset() }}>
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={submitting || rating === 0 || !message.trim()}
              >
                {submitting ? 'Sending...' : 'Send feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 2: Create index.ts barrel export**

```typescript
export { default } from './FeedbackButton'
```

---

### Task 6: Integrate `FeedbackButton` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add import**

Add after the existing Tooltip import:
```typescript
import FeedbackButton from './components/FeedbackButton'
```

**Step 2: Render `FeedbackButton` in `AuthenticatedApp`**

Add `<FeedbackButton onToast={showToast} />` just before the closing `</>` of the `AuthenticatedApp` return, after the `accessRequestStack` div. This places it as a floating element available on all views.

**Step 3: Verify**

Run `pnpm run dev` and confirm:
- Purple floating button visible bottom-right
- Click opens modal with stars + textarea
- Submit sends to edge function
- Toast appears on success

---

### Task 7: Set Slack webhook secret and test end-to-end

**Step 1: Ask user for webhook URL**

Get the `SLACK_FEEDBACK_WEBHOOK_URL` from the user.

**Step 2: Set secret on Supabase**

```bash
npx supabase secrets set SLACK_FEEDBACK_WEBHOOK_URL=<url>
```

**Step 3: End-to-end test**

Submit feedback through the UI and confirm:
- Row appears in `user_feedback` table
- Slack message arrives in the channel

---

### Task 8: Commit

```bash
git add src/services/userFeedback.ts src/components/FeedbackButton/ src/App.tsx
git commit -m "feat: add floating feedback button with star rating, Supabase storage, and Slack notifications"
```
