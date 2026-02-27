import { useState, type KeyboardEvent } from 'react'
import styles from './ChatInput.module.css'

function SendIcon() {
  return (
    <svg viewBox="0 0 512 512" width={18} height={18} fill="currentColor">
      <path d="m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z" />
    </svg>
  )
}

const MAX_LENGTH = 100

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')

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

  return (
    <div className={styles.inputBar}>
      <div className={styles.inputWrapper}>
        <input
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
