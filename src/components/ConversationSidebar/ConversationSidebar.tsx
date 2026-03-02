import { useState, useMemo, useEffect, useRef } from 'react'
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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onPinConversation,
  onSignOut,
  userEmail,
  isOpen,
  isLoading,
  onOpenConfig,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close conversation dropdown on click outside or scroll
  useEffect(() => {
    if (!menuOpenId) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    const handleScroll = () => setMenuOpenId(null)
    const listEl = listRef.current
    document.addEventListener('mousedown', handleClick)
    listEl?.addEventListener('scroll', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      listEl?.removeEventListener('scroll', handleScroll)
    }
  }, [menuOpenId])


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

  const renderConversation = (conv: ConversationSummary) => (
    <motion.button
      key={conv.id}
      layout
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => onSelectConversation(conv.id)}
      className={`${styles.conversationButton}${conv.id === activeConversationId ? ` ${styles.conversationButtonActive}` : ''}`}
    >
      <div className={styles.conversationText}>
        <div
          className={`${styles.conversationTitle}${conv.id === activeConversationId ? ` ${styles.conversationTitleActive}` : ''}`}
        >
          {conv.is_pinned && (
            <svg className={styles.pinIndicator} viewBox="0 0 24 24" width={12} height={12} fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
          {conv.title}
        </div>
        <div className={styles.conversationTime}>
          {timeAgo(conv.updated_at)}
        </div>
      </div>

      {/* 3-dot menu (desktop) */}
      <div className={styles.menuAnchor}>
        <span
          role="button"
          title="Options"
          onClick={(e) => {
            e.stopPropagation()
            if (menuOpenId === conv.id) {
              setMenuOpenId(null)
            } else {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setMenuPos({ top: rect.top, left: rect.right - 140 })
              setMenuOpenId(conv.id)
            }
          }}
          className={styles.menuTrigger}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </span>
      </div>

      {/* Pin toggle (mobile) */}
      <span
        role="button"
        title={conv.is_pinned ? 'Unpin' : 'Pin'}
        onClick={(e) => {
          e.stopPropagation()
          onPinConversation(conv.id, !conv.is_pinned)
        }}
        className={`${styles.mobilePinBtn}${conv.is_pinned ? ` ${styles.mobilePinBtnActive}` : ''}`}
      >
        <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      </span>
    </motion.button>
  )

  return (
    <div
      className={`${styles.sidebar}${isOpen ? ` ${styles.sidebarOpen}` : ''}`}
    >
      {/* Search */}
      {conversations.length > 0 && (
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" width={14} height={14} fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
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

      {/* Pinned group (non-scrolling) */}
      {pinned.length > 0 && (
        <div className={styles.pinnedSection}>
          <AnimatePresence initial={false}>
            {pinned.map(renderConversation)}
          </AnimatePresence>
          {unpinned.length > 0 && <div className={styles.divider} />}
        </div>
      )}

      {/* Conversation list (scrollable) */}
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

        {/* Unpinned group */}
        <AnimatePresence initial={false}>
          {unpinned.map(renderConversation)}
        </AnimatePresence>
      </div>

      {/* Fixed dropdown (rendered outside scroll container to avoid clipping) */}
      {menuOpenId && menuPos && (() => {
        const conv = conversations.find((c) => c.id === menuOpenId)
        if (!conv) return null
        return (
          <div
            ref={menuRef}
            className={styles.dropdown}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation()
                onPinConversation(conv.id, !conv.is_pinned)
                setMenuOpenId(null)
              }}
            >
              <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
              {conv.is_pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteConversation(conv.id)
                setMenuOpenId(null)
              }}
            >
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )
      })()}

      {/* User info + config + sign out */}
      <div className={styles.userFooter}>
        <div className={styles.userEmail}>
          {userEmail}
        </div>
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className={styles.configButton}
            title="Configuration"
          >
            <svg viewBox="0 0 20 20" width={16} height={16} fill="currentColor">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={onSignOut}
          className={styles.signOutButton}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
