import { HiOutlineTrash } from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConversationSummary } from '../services/conversations'
import styles from './ConversationSidebar.module.css'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onSignOut: () => void
  userEmail: string
  isOpen?: boolean
  isLoading?: boolean
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
  onSignOut,
  userEmail,
  isOpen,
  isLoading,
}: ConversationSidebarProps) {
  return (
    <div
      className={`${styles.sidebar}${isOpen ? ` ${styles.sidebarOpen}` : ''}`}
    >
      {/* Conversation list */}
      <div className={styles.conversationList}>
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
        <AnimatePresence initial={false}>
          {conversations.map((conv) => (
            <motion.button
              key={conv.id}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={() => onSelectConversation(conv.id)}
              className={`${styles.conversationButton}${conv.id === activeConversationId ? ` ${styles.conversationButtonActive}` : ''}`}
            >
              <div className={styles.conversationText}>
                <div
                  className={`${styles.conversationTitle}${conv.id === activeConversationId ? ` ${styles.conversationTitleActive}` : ''}`}
                >
                  {conv.title}
                </div>
                <div className={styles.conversationTime}>
                  {timeAgo(conv.updated_at)}
                </div>
              </div>
              <span
                data-delete
                role="button"
                title="Delete conversation"
                onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id) }}
                className={styles.deleteIcon}
              >
                <HiOutlineTrash />
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* User info + sign out */}
      <div className={styles.userFooter}>
        <div className={styles.userEmail}>
          {userEmail}
        </div>
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
