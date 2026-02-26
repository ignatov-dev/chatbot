import { useEffect, useRef } from 'react'
import { RiRobot2Line } from 'react-icons/ri'
import ChatMessage from './ChatMessage'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
}

export default function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: window.innerWidth <= 768 ? '12px 10px' : '20px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '14px',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '40px' }}>💬</div>
          <div>Ask me anything about CryptoPayX</div>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#4f2dd0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#fff',
              flexShrink: 0,
              marginRight: '8px',
              alignSelf: 'flex-end',
            }}
          >
            <RiRobot2Line size={18} />
          </div>
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#9ca3af',
                  display: 'inline-block',
                  animation: 'bounce 1.2s infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
