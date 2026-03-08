# Feedback Button Design

**Date:** 2026-03-08

## Summary

Floating feedback button in the bottom-right corner of the chatbot. Users click it to open a popup where they rate the chatbot (1-5 stars) and leave a free-text message. Feedback is saved to Supabase and sent to Slack.

## UI

- **Floating button** — fixed bottom-right, uses existing Tooltip ("Leave feedback")
- **Popup modal** — overlay dialog (pattern from ConfirmDialog/ShareDialog):
  - Star rating (1-5, clickable)
  - Textarea for message
  - Submit / Cancel buttons
- **Success** — toast notification ("Thanks for your feedback!") via existing toast pattern
- Styled with purple accent (#4f2dd0)

## Database

New `user_feedback` table:

| Column     | Type         | Notes              |
|------------|--------------|--------------------|
| id         | uuid         | PK, default gen    |
| user_id    | uuid         | FK to auth.users   |
| rating     | smallint     | 1-5                |
| message    | text         |                    |
| created_at | timestamptz  | default now()      |

RLS: users can insert their own feedback only.

## Edge Function (`feedback`)

- POST `{ rating, message }`
- Inserts into `user_feedback`
- Sends Slack notification via webhook (env: `SLACK_FEEDBACK_WEBHOOK_URL`)
- Slack format: user email, star rating, message, timestamp

## Frontend

- `src/services/userFeedback.ts` — calls the `feedback` edge function
- `src/components/FeedbackButton/` — floating button + popup component
- Integrated in `AuthenticatedApp` (rendered after the main layout)
