# Pin Conversation Design

## Goal

Allow users to pin conversations to the top of the sidebar. Replace the delete icon with a 3-dot dropdown menu containing Pin and Delete options.

## Database

Add `is_pinned boolean NOT NULL DEFAULT false` column to `conversations` table via Supabase migration.

## Service Layer

- Add `is_pinned` to `ConversationSummary` interface and `fetchConversations` select
- Add `pinConversation(id: string, pinned: boolean)` function

## UI Changes

### 3-Dot Dropdown Menu
- Replace delete trash icon with vertical ellipsis (3-dot) button
- Dropdown appears on click with two options:
  - Pin/Unpin (pin icon, label toggles based on state)
  - Delete (trash icon, red on hover)
- Closes on click outside or action selection

### Pinned Group
- Pinned conversations rendered first in the list
- Thin horizontal divider separates pinned from unpinned
- Divider only visible when both groups have items
- Each group sorted by `updated_at` descending
- Small pin icon shown next to pinned conversation titles

## Files

| File | Change |
|------|--------|
| `conversations.ts` | Add `is_pinned` to type/query, add `pinConversation()` |
| `ConversationSidebar.tsx` | 3-dot menu, dropdown, grouping, divider |
| `ConversationSidebar.module.css` | Dropdown, divider, pin icon styles |
| `App.tsx` | Add `handlePinConversation`, pass prop |
| Database | Migration: `is_pinned` column |
