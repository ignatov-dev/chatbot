import { useMemo } from 'react'
import { marked } from 'marked'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { stackoverflowLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import XBO from '/XBO.svg';

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  onOptionClick?: (option: string) => void
}

marked.setOptions({ breaks: true })

// Split markdown HTML into text segments and code blocks
function parseContent(html: string): Array<{ type: 'html'; value: string } | { type: 'code'; language: string; value: string }> {
  const parts: Array<{ type: 'html'; value: string } | { type: 'code'; language: string; value: string }> = []
  const codeBlockRegex = /<pre><code(?:\s+class="language-(\w+)")?>([^]*?)<\/code><\/pre>/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', value: html.slice(lastIndex, match.index) })
    }

    // Decode HTML entities in code content
    const code = match[2]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    parts.push({ type: 'code', language: match[1] || 'text', value: code })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < html.length) {
    parts.push({ type: 'html', value: html.slice(lastIndex) })
  }

  return parts
}

export default function ChatMessage({ role, content, options, onOptionClick }: ChatMessageProps) {
  const isUser = role === 'user'

  const parts = useMemo(() => {
    if (isUser) return []
    const html = marked.parse(content) as string
    return parseContent(html)
  }, [content, isUser])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      {!isUser && (
          <img src={XBO} alt="" style={{ width: '32px', height: '32px' }} />
      )}
      <div
        style={{
          maxWidth: '90%',
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
          <>
            <div className="md">
              {parts.map((part, i) =>
                part.type === 'code' ? (
                  <div key={i} style={{ margin: '8px 0' }}>
                    <SyntaxHighlighter language={part.language} style={stackoverflowLight}>
                      {part.value}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <div
                    key={i}
                    dangerouslySetInnerHTML={{ __html: part.value }}
                  />
                )
              )}
            </div>
            {options && options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {options.map((option) => (
                  <button
                    key={option}
                    onClick={() => onOptionClick?.(option)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      border: '1px solid #e5e7eb',
                      borderRadius: '18px',
                      background: '#f3f4f6',
                      color: '#111827',
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4f2dd0'
                      e.currentTarget.style.color = '#ffffff'
                      e.currentTarget.style.borderColor = '#4f2dd0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.color = '#111827'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
