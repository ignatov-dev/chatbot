import { useState, type KeyboardEvent } from 'react'

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

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Initializing AI model…' : `Ask me anything about ${placeholder ?? 'XBO Token'}… (Enter to send)`}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          border: '1px solid #d1d5db',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '14px',
          lineHeight: '1.5',
          outline: 'none',
          fontFamily: 'inherit',
          background: disabled ? '#f9fafb' : '#ffffff',
          color: '#111827',
          maxHeight: '120px',
          overflowY: 'auto',
        }}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }}
      />
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
        ↑
      </button>
    </div>
  )
}
