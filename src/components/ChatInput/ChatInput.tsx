import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import Fuse from 'fuse.js'
import { AnimatePresence } from 'framer-motion'
import type { AutocompleteSuggestion } from '../../services/autocompleteSuggestions'
import SuggestionBubble from './SuggestionBubble'
import styles from './ChatInput.module.css'

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
  )
}

const MAX_LENGTH = 200

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
  placeholder?: string
  focusTrigger?: string | null
  autocompleteSuggestions?: AutocompleteSuggestion[]
}

export default function ChatInput({ onSend, disabled, placeholder, focusTrigger, autocompleteSuggestions = [] }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [focusTrigger])

  // Debounce input value for fuzzy matching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), 150)
    return () => clearTimeout(timer)
  }, [value])

  // Fuse.js instance
  const fuse = useMemo(
    () =>
      new Fuse(autocompleteSuggestions, {
        keys: [
          { name: 'question', weight: 0.7 },
          { name: 'keywords', weight: 0.3 },
        ],
        threshold: 0.3,
        includeScore: true,
      }),
    [autocompleteSuggestions],
  )

  // Top fuzzy match
  const topMatch = useMemo(() => {
    const trimmed = debouncedValue.trim()
    if (trimmed.length < 3) return null
    const results = fuse.search(trimmed, { limit: 1 })
    if (results.length === 0) return null
    return results[0].item
  }, [debouncedValue, fuse])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOverLimit = value.length > MAX_LENGTH

  const handleBubbleClick = () => {
    if (!topMatch) return
    onSend(topMatch.question)
    setValue('')
  }

  return (
    <div className={styles.inputBar} onClick={() => inputRef.current?.focus()}>
      <AnimatePresence>
        {topMatch && !disabled && (
          <SuggestionBubble
            key={topMatch.id}
            text={topMatch.question}
            onClick={handleBubbleClick}
          />
        )}
      </AnimatePresence>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder={disabled ? 'Initializing AI model…' : `Ask me anything about ${placeholder}…`}
          className={styles.input}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />
        <span
          className={`${styles.charCount}${isOverLimit ? ` ${styles.charCountOver}` : ''}`}
        >
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={styles.sendButton}
        aria-label="Send"
      >
        <SendIcon />
      </button>
    </div>
  )
}
