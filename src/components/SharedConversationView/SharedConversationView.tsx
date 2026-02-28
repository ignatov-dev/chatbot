import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ChatMessage from '../ChatMessage'
import XBO from '/XBO.svg'
import { useSharedConversation } from '../../hooks/useSharedConversation'
import styles from './SharedConversationView.module.css'

export default function SharedConversationView() {
  const { id } = useParams<{ id: string }>()
  const {
    loading,
    title,
    messages,
    notFound,
    linkStatus,
    requestSent,
    requestLoading,
    requestAccess,
  } = useSharedConversation(id)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <img src={XBO} alt="" className={styles.logo} />
          <div className={styles.headerInfo}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonBadge} />
          </div>
        </div>
        <div className={styles.messagesArea}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonMessage} />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    if (linkStatus === 'expired') {
      return (
        <div className={styles.shell}>
          <div className={styles.header}>
            <img src={XBO} alt="" className={styles.logo} />
            <div className={styles.headerInfo}>
              <div className={styles.headerTitle}>Link expired</div>
            </div>
          </div>
          <div className={styles.notFound}>
            <div className={styles.notFoundIcon}>&#9203;</div>
            <p className={styles.notFoundText}>This share link has expired.</p>
            {requestSent ? (
              <p className={styles.requestSentText}>
                Access request sent.<br />
                You'll see the conversation here if the owner restores access.
              </p>
            ) : (
              <button
                className={styles.requestAccessBtn}
                onClick={requestAccess}
                disabled={requestLoading}
              >
                {requestLoading ? 'Sending...' : 'Request access'}
              </button>
            )}
            <a href="/" className={styles.ctaLink}>
              Start your own conversation
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <img src={XBO} alt="" className={styles.logo} />
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>Conversation not found</div>
          </div>
        </div>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>🔗</div>
          <p className={styles.notFoundText}>
            This conversation doesn't exist, is no longer shared, or the share link has expired.
          </p>
          <a href="/" className={styles.ctaLink}>
            Start your own conversation
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <img src={XBO} alt="" className={styles.logo} />
        <div className={styles.headerInfo}>
          <div className={styles.headerTitle}>{title}</div>
          <div className={styles.sharedBadge}>Shared conversation</div>
        </div>
      </div>
      <div className={styles.messagesArea}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <ChatMessage role={msg.role} content={msg.content} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
      <div className={styles.footer}>
        <a href="/" className={styles.ctaLink}>
          Start your own conversation
        </a>
      </div>
    </div>
  )
}
