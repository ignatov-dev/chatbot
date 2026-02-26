import { marked } from 'marked'
import { RiRobot2Line } from 'react-icons/ri'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

marked.setOptions({ breaks: true })

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      {!isUser && (
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
      )}
      <div
        style={{
          maxWidth: '72%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? '#4f2dd0' : '#ffffff',
          color: isUser ? '#ffffff' : '#111827',
          fontSize: '14px',
          lineHeight: '1.5',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        ) : (
          <div
            className="md"
            dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
          />
        )}
      </div>
    </div>
  )
}
