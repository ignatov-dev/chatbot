import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import XBO from '/XBO.svg';
import ChatMessage from '../ChatMessage'
import styles from './ChatWindow.module.css'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: string[]
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
  themeLabel?: string
  onOptionClick?: (messageId: string, option: string) => void
}

export default function ChatWindow({ messages, isLoading, themeLabel, onOptionClick }: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isLoading])

  return (
    <div
      ref={containerRef}
      className={styles.container}
    >
      {messages.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyEmoji}>💬</div>
          <div>Ask me anything about {themeLabel ?? 'CryptoPayX'}</div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ChatMessage
              role={msg.role}
              content={msg.content}
              options={msg.options}
              onOptionClick={onOptionClick ? (option: string) => onOptionClick(msg.id, option) : undefined}
            />
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            key="typing-indicator"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={styles.typingRow}
          >
            <div className={styles.typingAvatar}>
              <img src={XBO} alt="" className={styles.typingAvatarImg} />
            </div>
            <div className={styles.typingBubble}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={styles.typingDot}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div />

    </div>
  )
}
