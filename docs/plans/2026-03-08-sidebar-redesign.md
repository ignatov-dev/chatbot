# Sidebar Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the CSS-modules sidebar with a shadcn/ui Sidebar component, initializing Tailwind + shadcn as the project's component foundation.

**Architecture:** Install Tailwind CSS 4 (Vite plugin) + shadcn/ui. Initialize shadcn with purple theme. Rewrite ConversationSidebar using shadcn Sidebar primitives. Wrap app layout with SidebarProvider + SidebarInset. Remove framer-motion from sidebar; keep it for the rest of the app.

**Tech Stack:** React 19, Tailwind CSS 4, shadcn/ui, Vite

---

### Task 1: Install Tailwind CSS 4

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/index.css`

**Step 1: Install Tailwind CSS v4 and the Vite plugin**

```bash
pnpm add tailwindcss @tailwindcss/vite
```

**Step 2: Add the Tailwind Vite plugin**

In `vite.config.ts`, add the import and plugin:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
```

**Step 3: Add Tailwind import to the top of `src/index.css`**

Add as the very first line:

```css
@import "tailwindcss";
```

**Step 4: Verify dev server still starts**

```bash
pnpm run dev
```

Expected: App loads without errors. Existing CSS modules still work.

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/index.css
git commit -m "chore: add Tailwind CSS 4 with Vite plugin"
```

---

### Task 2: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: `src/index.css` (CSS variables)
- Modify: `tsconfig.app.json` (path aliases)
- Modify: `vite.config.ts` (path aliases)

**Step 1: Add path alias for `@/` to tsconfig.app.json**

Add `baseUrl` and `paths` to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    // ... existing options
  }
}
```

**Step 2: Add path alias to vite.config.ts**

```ts
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
```

**Step 3: Run shadcn init**

```bash
pnpm dlx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

This creates `components.json` and `src/lib/utils.ts` (with the `cn()` helper).

**Step 4: Customize CSS variables for purple theme**

In `src/index.css`, update the shadcn-generated `:root` / `@theme` block. Set the purple primary:

```css
--primary: oklch(0.398 0.195 277.366);       /* #4f2dd0 */
--primary-foreground: oklch(1 0 0);           /* white */
--sidebar-background: oklch(1 0 0);           /* white */
--sidebar-foreground: oklch(0.145 0.014 285.823);
--sidebar-accent: oklch(0.953 0.023 285);     /* #f3f0ff light purple */
--sidebar-accent-foreground: oklch(0.398 0.195 277.366);
--sidebar-border: oklch(0.902 0.006 286);     /* #e5e7eb */
```

Note: The exact oklch values should be tuned. Use the shadcn themes page or convert hex manually. The key is `--primary` maps to #4f2dd0 and `--sidebar-accent` maps to #f3f0ff.

**Step 5: Verify**

```bash
pnpm run dev
```

Expected: App loads. No visual changes yet (no shadcn components used).

**Step 6: Commit**

```bash
git add components.json src/lib/utils.ts src/index.css tsconfig.app.json vite.config.ts
git commit -m "chore: initialize shadcn/ui with purple theme"
```

---

### Task 3: Install shadcn components

**Files:**
- Create: `src/components/ui/sidebar.tsx` (and related)
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/skeleton.tsx`

**Step 1: Install all needed components**

```bash
pnpm dlx shadcn@latest add sidebar input dropdown-menu separator button tooltip skeleton
```

This will also pull in required dependencies (e.g., `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-separator`, etc.)

**Step 2: Verify components were created**

Check that `src/components/ui/` contains the expected files.

**Step 3: Commit**

```bash
git add src/components/ui/ package.json pnpm-lock.yaml
git commit -m "chore: add shadcn sidebar, input, dropdown-menu, separator, button, tooltip, skeleton"
```

---

### Task 4: Rewrite ConversationSidebar with shadcn Sidebar

**Files:**
- Rewrite: `src/components/ConversationSidebar/ConversationSidebar.tsx`
- Delete: `src/components/ConversationSidebar/ConversationSidebar.module.css`

This is the core task. Rewrite the sidebar component using shadcn primitives.

**Step 1: Rewrite ConversationSidebar.tsx**

The new component should use:

```tsx
import { useMemo, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MoreVertical, Pin, Trash2, Settings, LogOut, Search, X } from 'lucide-react'
```

**Props interface stays the same** (minus `isOpen`):

```tsx
interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onPinConversation: (id: string, pinned: boolean) => void
  onSignOut: () => void
  userEmail: string
  isLoading?: boolean
  isAdmin?: boolean
  onOpenConfig?: () => void
}
```

**Component structure:**

```tsx
export default function ConversationSidebar({ ... }: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Same filtering logic: filteredConversations, pinned, unpinned
  const filteredConversations = useMemo(() => { ... }, [conversations, searchQuery])
  const pinned = useMemo(() => filteredConversations.filter(c => c.is_pinned), [filteredConversations])
  const unpinned = useMemo(() => filteredConversations.filter(c => !c.is_pinned), [filteredConversations])

  // Keep existing timeAgo function

  return (
    <Sidebar>
      <SidebarHeader>
        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Pinned section */}
        {pinned.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarMenu>
              {pinned.map(conv => renderConversationItem(conv))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {pinned.length > 0 && unpinned.length > 0 && <Separator className="mx-2" />}

        {/* Recent section */}
        <SidebarGroup>
          {pinned.length > 0 && <SidebarGroupLabel>Recent</SidebarGroupLabel>}
          <SidebarMenu>
            {isLoading && conversations.length === 0 && (
              Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuButton>
                    <div className="flex flex-col gap-1.5 w-full">
                      <Skeleton className="h-3.5 w-[var(--w)]" style={{ '--w': `${65 + (i * 17) % 30}%` } as React.CSSProperties} />
                      <Skeleton className="h-2.5 w-[40%]" />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
            {!isLoading && conversations.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">
                No conversations yet
              </p>
            )}
            {!isLoading && conversations.length > 0 && filteredConversations.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">
                No conversations found
              </p>
            )}
            {unpinned.map(conv => renderConversationItem(conv))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <span className="flex-1 text-xs text-muted-foreground truncate">
            {userEmail}
          </span>
          {onOpenConfig && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenConfig}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configuration</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSignOut}>
                Sign out
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**The `renderConversationItem` helper:**

```tsx
function renderConversationItem(conv: ConversationSummary) {
  return (
    <SidebarMenuItem key={conv.id}>
      <SidebarMenuButton
        isActive={conv.id === activeConversationId}
        onClick={() => onSelectConversation(conv.id)}
        tooltip={conv.title}
      >
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm">
            {conv.is_pinned && <Pin className="inline h-3 w-3 mr-1 text-muted-foreground" />}
            {conv.title}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(conv.updated_at)}
          </span>
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction>
            <MoreVertical className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => onPinConversation(conv.id, !conv.is_pinned)}>
            <Pin className="h-4 w-4 mr-2" />
            {conv.is_pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteConversation(conv.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
```

**Step 2: Delete the CSS module file**

Delete `src/components/ConversationSidebar/ConversationSidebar.module.css`.

**Step 3: Update `src/components/ConversationSidebar/index.ts`**

Ensure it still exports the default:

```ts
export { default } from './ConversationSidebar'
```

**Step 4: Install lucide-react (icon library used by shadcn)**

```bash
pnpm add lucide-react
```

**Step 5: Verify sidebar renders**

```bash
pnpm run dev
```

Expected: Sidebar renders with shadcn styling. Search, pinned/unpinned groups, dropdown menus, and footer all work.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: rewrite ConversationSidebar with shadcn Sidebar component"
```

---

### Task 5: Integrate SidebarProvider in App layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css` (remove sidebar-overlay styles)

**Step 1: Wrap the chat layout with SidebarProvider**

In `src/App.tsx`, in the `AuthenticatedApp` component:

- Import `SidebarProvider`, `SidebarInset`, `SidebarTrigger` from `@/components/ui/sidebar`
- Import `TooltipProvider` from `@/components/ui/tooltip`
- Remove `sidebarOpen` / `setSidebarOpen` state
- Remove the `isOpen` prop from `ConversationSidebar`
- Replace the hamburger button with `SidebarTrigger`
- Wrap layout with `SidebarProvider` and use `SidebarInset` for main content

The chat view section (inside the `motion.div key="chat"`) becomes:

```tsx
<SidebarProvider>
  <ConversationSidebar
    conversations={conversations}
    activeConversationId={activeConversationId}
    onSelectConversation={(id) => setActiveConversationId(id)}
    onDeleteConversation={(id) => setDeleteConfirmId(id)}
    onPinConversation={handlePinConversation}
    onSignOut={onSignOut}
    userEmail={user.email ?? ''}
    isLoading={isLoadingConversations}
    isAdmin={isAdmin}
    onOpenConfig={isAdmin ? () => navigate('/config') : undefined}
  />
  <SidebarInset>
    <main className={styles.mainColumn}>
      {/* Header — replace hamburger-btn with SidebarTrigger */}
      ...existing header with SidebarTrigger replacing the hamburger button...
      {/* Messages */}
      ...
      {/* Input */}
      ...
    </main>
  </SidebarInset>
</SidebarProvider>
```

Also wrap the entire app (or at least the authenticated section) with `TooltipProvider` so tooltips work.

**Step 2: Remove sidebar-overlay from `src/index.css`**

Remove the `.sidebar-overlay` CSS rules (lines ~56 and ~147-153). shadcn Sidebar handles the mobile overlay internally.

**Step 3: Remove hamburger-btn from `src/index.css`**

Remove the `.hamburger-btn` CSS rules. Replace with `SidebarTrigger` component.

**Step 4: Remove the sidebar overlay div from App.tsx**

Remove: `{sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}`

**Step 5: Verify the full integration**

```bash
pnpm run dev
```

Expected:
- Sidebar renders on the left, main content adjusts automatically
- On mobile (< 768px), sidebar appears as a sheet overlay
- SidebarTrigger toggles the sidebar on mobile
- All conversation operations (select, pin, delete, search) still work
- Config and sign out still work

**Step 6: Run type check**

```bash
pnpm run build:typecheck
```

Expected: No type errors.

**Step 7: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: integrate SidebarProvider in app layout, replace custom mobile sidebar"
```

---

### Task 6: Visual polish and cleanup

**Files:**
- Modify: `src/components/ConversationSidebar/ConversationSidebar.tsx` (fine-tune classes)
- Modify: `src/index.css` (remove leftover sidebar CSS)

**Step 1: Fine-tune sidebar styling**

- Ensure the sidebar has `className="rounded-2xl shadow-lg"` on desktop (matching the current card-like appearance within the `.app-shell` container)
- Verify active item uses the purple accent (`--sidebar-accent: #f3f0ff`)
- Check search input focus ring uses purple
- Verify dropdown menu animation is smooth
- Check footer alignment and spacing

**Step 2: Remove any leftover sidebar CSS**

Clean up any remaining sidebar-related styles from `src/index.css` that are no longer needed (hamburger-btn, sidebar-overlay).

**Step 3: Test mobile responsive behavior**

Resize browser to < 768px:
- Sidebar should appear as a slide-out sheet
- Selecting a conversation should close the sidebar
- SidebarTrigger should be visible in the header

**Step 4: Build verification**

```bash
pnpm run build
```

Expected: Builds successfully with no errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "style: polish sidebar design, clean up leftover CSS"
```

---

### Task 7: Remove framer-motion from sidebar dependencies

**Files:**
- Verify: `src/components/ConversationSidebar/ConversationSidebar.tsx` has no framer-motion imports

**Step 1: Confirm no framer-motion usage in sidebar**

The rewritten sidebar should not import `framer-motion` or use `motion`, `AnimatePresence`. Confirm this.

Note: Do NOT remove framer-motion from `package.json` — it's still used in `App.tsx` and other components.

**Step 2: Final type check and build**

```bash
pnpm run build:typecheck
pnpm run build
```

Expected: Clean build, no errors.

**Step 3: Commit (if any changes needed)**

```bash
git commit -m "refactor: remove framer-motion dependency from sidebar"
```
