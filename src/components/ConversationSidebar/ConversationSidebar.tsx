import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConversationSummary } from '../../services/conversations'
import styles from './ConversationSidebar.module.css'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onPinConversation: (id: string, pinned: boolean) => void
  onSignOut: () => void
  userEmail: string
  isOpen?: boolean
  isLoading?: boolean
  isAdmin?: boolean
  onOpenConfig?: () => void
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation: _onDeleteConversation,
  onPinConversation,
  onSignOut,
  userEmail,
  isOpen,
  isLoading,
  isAdmin,
  onOpenConfig,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Track scroll position to show/hide fade shadows
  const updateScrollShadows = useCallback((el: HTMLElement) => {
    const canScrollUp = el.scrollTop > 0
    const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    el.classList.toggle(styles.scrollShadowTop, canScrollUp)
    el.classList.toggle(styles.scrollShadowBottom, canScrollDown)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handler = (e: Event) => updateScrollShadows(e.target as HTMLElement)
    updateScrollShadows(el)
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [updateScrollShadows, conversations])

  // Close settings popover on click outside
  useEffect(() => {
    if (!settingsOpen) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, searchQuery])

  const pinned = useMemo(
    () => filteredConversations.filter((c) => c.is_pinned),
    [filteredConversations],
  )
  const unpinned = useMemo(
    () => filteredConversations.filter((c) => !c.is_pinned),
    [filteredConversations],
  )

  const renderConversation = (conv: ConversationSummary) => {
    const isActive = conv.id === activeConversationId
    const isPinned = conv.is_pinned

    const classNames = [
      styles.conversationButton,
      isActive && styles.conversationButtonActive,
      isPinned && styles.conversationButtonPinned,
    ].filter(Boolean).join(' ')

    return (
      <motion.button
        key={conv.id}
        layout
        animate={{ opacity: 1, height: 'auto', y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={() => onSelectConversation(conv.id)}
        className={classNames}
      >
        <div className={styles.conversationText}>
          <div
            className={`${styles.conversationTitle}${isActive ? ` ${styles.conversationTitleActive}` : ''}`}
          >
            {conv.title}
          </div>
        </div>

        {/* Pin toggle */}
        <span
          role="button"
          title={isPinned ? 'Unpin' : 'Pin'}
          onClick={(e) => {
            e.stopPropagation()
            onPinConversation(conv.id, !isPinned)
          }}
          className={`${styles.pinBtn}${isPinned ? ` ${styles.pinBtnActive}` : ''}`}
        >
          <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" style={{ transform: 'rotate(45deg)' }}>
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </span>
      </motion.button>
    )
  }

  return (
    <div
      className={`${styles.sidebar}${isOpen ? ` ${styles.sidebarOpen}` : ''}`}
    >
      {/* Search */}
      {conversations.length > 0 && (
        <div className={styles.searchWrapper}>
          {/* <svg className={styles.searchIcon} viewBox="0 0 20 20" width={14} height={14} fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg> */}
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 20 20" width={12} height={12} fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Conversations — single scroll */}
      <div className={styles.conversationList} ref={listRef}>
        {isLoading && conversations.length === 0 && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={styles.skeletonItem}
              >
                <div
                  className={styles.skeletonTitle}
                  style={{ width: `${65 + (i * 17) % 30}%`, animationDelay: `${i * 0.1}s` }}
                />
                <div
                  className={styles.skeletonSubtitle}
                  style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
                />
              </div>
            ))}
          </>
        )}
        {!isLoading && conversations.length === 0 && (
          <p className={styles.emptyText}>
            No conversations yet
          </p>
        )}
        {!isLoading && conversations.length > 0 && filteredConversations.length === 0 && (
          <p className={styles.emptyText}>
            No conversations found
          </p>
        )}
        <AnimatePresence initial={false}>
          {pinned.map(renderConversation)}
        </AnimatePresence>
        {pinned.length > 0 && unpinned.length > 0 && <div className={styles.sectionDivider} />}
        <AnimatePresence initial={false}>
          {unpinned.map(renderConversation)}
        </AnimatePresence>
      </div>

      {/* Footer — avatar + email + settings gear */}
      <div className={styles.userFooter} ref={settingsRef}>
        <div className={styles.userEmail}>
          {userEmail}
        </div>
        <div className={styles.footerButtons}>
          {isAdmin && onOpenConfig && (
            <button
              className={styles.footerBtn}
              onClick={() => onOpenConfig()}
            >
              Settings
            </button>
          )}
          <button
            className={`${styles.footerBtn} ${styles.footerBtnDanger}`}
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
        {/* <button
          className={styles.settingsButton}
          title="Settings"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.248a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button> */}

        {/* Settings popover */}
        {settingsOpen && (
          <div className={styles.settingsPopover}>
            {isAdmin && onOpenConfig && (
              <button
                className={styles.settingsPopoverItem}
                onClick={() => {
                  setSettingsOpen(false)
                  onOpenConfig()
                }}
              >
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Configuration
              </button>
            )}
            <button
              className={`${styles.settingsPopoverItem} ${styles.settingsPopoverItemDanger}`}
              onClick={() => {
                setSettingsOpen(false)
                onSignOut()
              }}
            >
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
