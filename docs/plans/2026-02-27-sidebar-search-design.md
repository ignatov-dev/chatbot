# Sidebar Search Design

## Goal

Add a search input to the conversation sidebar that filters conversations by title.

## Approach

Client-side filtering of the already-loaded conversations array. No API calls, no database changes.

## UI

- Search input placed at the top of the sidebar, above the conversation list
- Magnifying glass icon inside the input
- Placeholder: "Search conversations..."
- Clear (x) button appears when the input has text
- Instant filtering as the user types (no debounce — list is small)

## Behavior

- Case-insensitive substring match on conversation title
- Empty query shows all conversations
- Search resets when the active theme changes
- "No conversations found" empty state when no results match

## Scope

| File | Change |
|------|--------|
| `ConversationSidebar.tsx` | Add `searchQuery` state, search input, filter logic |
| `ConversationSidebar.module.css` | Add search input styles |

No changes to App.tsx, services, or database.
