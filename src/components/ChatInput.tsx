import { useState, type KeyboardEvent } from 'react'
import { IoSend } from 'react-icons/io5'

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOverLimit = value.length > MAX_LENGTH

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder={disabled ? 'Initializing AI model…' : `Ask me anything about ${placeholder}…`}
          rows={1}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            padding: '10px 14px',
            paddingRight: '70px',
            fontSize: '14px',
            lineHeight: '1.5',
            outline: 'none',
            fontFamily: 'inherit',
            background: disabled ? '#f9fafb' : '#ffffff',
            color: '#111827',
            height: '100%',
            overflowY: 'auto',
          }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '11px',
            color: isOverLimit ? '#ef4444' : '#9ca3af',
            pointerEvents: 'none',
            lineHeight: '1.5',
          }}
        >
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          border: 'none',
          background: disabled || !value.trim() ? '#d1d5db' : '#4f2dd0',
          color: '#ffffff',
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '18px',
          transition: 'background 0.15s',
        }}
        aria-label="Send"
      >
        <IoSend size={18} />
      </button>
    </div>
  )
}
