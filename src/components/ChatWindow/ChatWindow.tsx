import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import XBO from '/XBO.svg';
import ChatMessage from '../ChatMessage'
import type { FeedbackRating, FeedbackReason, MessageFeedback } from '../../services/feedback'
import styles from './ChatWindow.module.css'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  created_at?: string
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
  themeLabel?: string
  onOptionClick?: (messageId: string, option: string) => void
  suggestions?: Array<{ id: string; text: string }>
  onSuggestionClick?: (text: string) => void
  feedbackMap?: Record<string, MessageFeedback>
  onFeedback?: (messageId: string, rating: FeedbackRating, reasons?: FeedbackReason[]) => void
  onRemoveFeedback?: (messageId: string) => void
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  const month = d.toLocaleString('en-US', { month: 'long' })
  const day = d.getDate()
  if (d.getFullYear() === now.getFullYear()) return `${month} ${day}`
  return `${month} ${day}, ${d.getFullYear()}`
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function ChatWindow({ messages, isLoading, onOptionClick, suggestions, onSuggestionClick, feedbackMap, onFeedback, onRemoveFeedback }: ChatWindowProps) {
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
          <div className={styles.emptyEmoji}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="#1C274C" fill="#eaecfc" stroke-width="0.5"/>
              <path d="M8 12H8.009M11.991 12H12M15.991 12H16" stroke="#1C274C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          {suggestions && suggestions.length > 0 && (
            <div className={styles.suggestionsRow}>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className={styles.suggestionChip}
                  onClick={() => onSuggestionClick?.(s.text)}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg, i) => {
          const prevMsg = i > 0 ? messages[i - 1] : null
          const showDateSeparator = msg.created_at && (
            i === 0 || !prevMsg?.created_at || getDateKey(msg.created_at) !== getDateKey(prevMsg.created_at)
          )

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {showDateSeparator && msg.created_at && (
                <div className={styles.dateSeparator}><span className={styles.dateSeparatorLabel}>{formatDateLabel(msg.created_at)}</span></div>
              )}
              <ChatMessage
                role={msg.role}
                content={msg.content}
                options={msg.options}
                onOptionClick={onOptionClick}
                messageId={msg.id}
                feedback={feedbackMap?.[msg.id] ?? null}
                onFeedback={onFeedback}
                onRemoveFeedback={onRemoveFeedback}
              />
            </motion.div>
          )
        })}

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
