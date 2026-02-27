import { useState, type KeyboardEvent } from 'react'
import { IoSend } from 'react-icons/io5'
import styles from './ChatInput.module.css'

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
        <IoSend size={18} />
      </button>
    </div>
  )
}
