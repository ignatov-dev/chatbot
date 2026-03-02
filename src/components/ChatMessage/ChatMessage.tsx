import { useMemo } from 'react'
import { marked } from 'marked'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { stackoverflowLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import XBO from '/XBO.svg';
import styles from './ChatMessage.module.css'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  onOptionClick?: (option: string) => void
}

marked.setOptions({ breaks: true })

// Convert <video> tags with YouTube URLs to <iframe> embeds
function convertYouTubeVideos(html: string): string {
  return html.replace(
    /<video[^>]*\ssrc=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^"']*)["'][^>]*>(?:<\/video>)?/gi,
    (_, _url, videoId) =>
      `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:8px;margin:8px 0;aspect-ratio:16/9"></iframe>`
  )
}

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
    return parseContent(convertYouTubeVideos(html))
  }, [content, isUser])

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}>
      {!isUser && (
          <img src={XBO} alt="" className={styles.avatar} />
      )}
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {isUser ? (
          <span className={styles.userText}>{content}</span>
        ) : (
          <>
            <div className="md">
              {parts.map((part, i) =>
                part.type === 'code' ? (
                  <div key={i} className={styles.codeBlock}>
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
              <div className={styles.optionsRow}>
                {options.map((option) => (
                  <button
                    key={option}
                    onClick={() => onOptionClick?.(option)}
                    className={styles.optionButton}
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
