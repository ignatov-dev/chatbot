# Autocomplete Suggestions Admin Section

## Context

We just added an `autocomplete_suggestions` table and a suggestion bubble feature in the chat input. Now we need admin UI to manage these suggestions (CRUD) and per-role filtering, plus a new `autocomplete_access` permission to control tab visibility.

## Design

Follow the exact same pattern as the existing Suggestions tab:
- New "Autocomplete" tab in AdminConfig
- CRUD: add/edit/delete autocomplete suggestions (question + keywords)
- Per-role toggles: which autocomplete suggestions each role sees
- New `autocomplete_access` permission field (none/view/edit)
- Role-filtered RPC so users only see their allowed suggestions

## Files to modify

- `role_permissions` table (migration) — add `autocomplete_access`, `allowed_autocomplete`
- Supabase RPCs: `get_role_permissions`, `update_role_permissions`, new `get_autocomplete_for_role`
- `src/services/permissions.ts` — add new fields to interface + updatePermissions call
- `src/services/autocompleteSuggestions.ts` — add CRUD functions + role-filtered fetch
- `src/contexts/AuthContext.tsx` — add autocompleteAccess, allAutocompleteSuggestions, refetch
- `src/components/AdminConfig/AdminConfig.tsx` — new tab + CRUD UI + per-role toggles
- `src/hooks/useAutocompleteSuggestions.ts` — switch to role-filtered RPC
