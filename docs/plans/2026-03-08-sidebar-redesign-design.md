# Sidebar Redesign with shadcn/ui

**Date:** 2026-03-08
**Goal:** Full modernization of the conversation sidebar — visual refresh, UX improvements, and introducing shadcn/ui + Tailwind as the component system foundation.
**Approach:** shadcn Sidebar component (Approach A)

## Foundation Setup

- Install Tailwind CSS 4 (Vite plugin) + shadcn/ui
- Configure CSS variables with purple theme (`--primary: #4f2dd0`)
- Add `cn()` utility in `lib/utils.ts`
- Keep existing CSS modules for non-sidebar components untouched

**shadcn components to install:** sidebar, input, dropdown-menu, separator, button, tooltip, skeleton

## Sidebar Architecture

```
Sidebar (260px, white, collapsible="icon")
├── SidebarHeader
│   └── Search input (shadcn Input with search icon)
├── SidebarContent (scrollable)
│   ├── SidebarGroup "Pinned" (conditional)
│   │   ├── SidebarGroupLabel
│   │   └── SidebarMenu → SidebarMenuItem per pinned conversation
│   │       ├── SidebarMenuButton (title + time ago)
│   │       └── SidebarMenuAction → DropdownMenu (pin/delete)
│   ├── Separator
│   └── SidebarGroup "Recent"
│       ├── SidebarGroupLabel
│       └── SidebarMenu → SidebarMenuItem per unpinned conversation
└── SidebarFooter
    └── User email + config button + sign out button
```

### Key behavior changes

- **Collapsible:** Sidebar collapses to ~48px icon-only mode with tooltips
- **Context menu:** Custom fixed-position dropdown replaced by shadcn DropdownMenu on SidebarMenuAction
- **Active state:** Uses `isActive` prop on SidebarMenuButton
- **Animations:** framer-motion removed; shadcn handles transitions
- **Mobile:** Bottom-sheet replaced by shadcn's built-in side-sheet overlay

### What stays the same

- Search filtering logic (pinned/unpinned split)
- `timeAgo()` utility
- All callbacks (onSelectConversation, onDeleteConversation, onPinConversation, onSignOut)
- Pin indicator icon

## Visual Design

**Theme variables:**
- `--primary`: #4f2dd0 | `--primary-foreground`: #ffffff
- `--sidebar-background`: #ffffff | `--sidebar-foreground`: #111827
- `--sidebar-accent`: #f3f0ff | `--sidebar-accent-foreground`: #4f2dd0
- `--sidebar-border`: #e5e7eb | `--muted-foreground`: #9ca3af

**Typography:** Title 13px (bold when active), time 11px muted, group labels 11px uppercase tracking-wide, email 12px muted.

**Collapse:** 48px width, chevron toggle in header, circular icons for items, tooltip on hover, ~200ms ease transition.

## App Layout Integration

```tsx
// Before
<div className="app-layout">
  <ConversationSidebar ... />
  <main><ChatWindow /></main>
</div>

// After
<SidebarProvider>
  <ConversationSidebar ... />
  <SidebarInset>
    <ChatWindow />
  </SidebarInset>
</SidebarProvider>
```

- `SidebarProvider` manages collapse and mobile state
- `isOpen` prop removed — shadcn manages internally
- Mobile toggle uses `useSidebar().toggleSidebar()`
- All other props unchanged
