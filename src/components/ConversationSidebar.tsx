import { HiOutlineTrash } from 'react-icons/hi'
import type { ConversationSummary } from '../services/conversations'

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
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div
      style={{
        width: '260px',
        borderRight: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed' as const,
          bottom: 0,
          left: 0,
          right: 0,
          top: 'auto' as const,
          width: '100vw',
          height: '70dvh',
          zIndex: 1000,
          borderRight: 'none',
          borderTop: '1px solid #e5e7eb',
          borderRadius: '16px 16px 0 0',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
          boxShadow: isOpen ? '0 -4px 16px rgba(0,0,0,0.1)' : 'none',
        } : {}),
      }}
    >
      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isLoading && conversations.length === 0 && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  marginBottom: '2px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    height: '13px',
                    borderRadius: '4px',
                    background: '#e5e7eb',
                    width: `${65 + (i * 17) % 30}%`,
                    animation: 'shimmer 1.5s infinite',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
                <div
                  style={{
                    height: '11px',
                    borderRadius: '4px',
                    background: '#f3f4f6',
                    width: '40%',
                    animation: 'shimmer 1.5s infinite',
                    animationDelay: `${i * 0.1 + 0.05}s`,
                  }}
                />
              </div>
            ))}
            <style>{`
              @keyframes shimmer {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
            `}</style>
          </>
        )}
        {!isLoading && conversations.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', padding: '16px 0' }}>
            No conversations yet
          </p>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              marginBottom: '2px',
              background: conv.id === activeConversationId ? '#f3f0ff' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.background = '#f9fafb'
              }
              const icon = e.currentTarget.querySelector('[data-delete]') as HTMLElement
              if (icon) icon.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.background = 'transparent'
              }
              const icon = e.currentTarget.querySelector('[data-delete]') as HTMLElement
              if (icon) icon.style.opacity = '0'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: conv.id === activeConversationId ? 600 : 400,
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conv.title}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                {timeAgo(conv.updated_at)}
              </div>
            </div>
            <span
              data-delete
              role="button"
              title="Delete conversation"
              onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id) }}
              style={{
                color: '#9ca3af',
                fontSize: '14px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                opacity: isMobile ? 1 : 0,
                transition: 'opacity 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af' }}
            >
              <HiOutlineTrash />
            </span>
          </button>
        ))}
      </div>

      {/* User info + sign out */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: 70
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: '12px',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {userEmail}
        </div>
        <button
          onClick={onSignOut}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            color: '#6b7280',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
