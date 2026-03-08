import { memo, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { stackoverflowLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import XBO from '/XBO.svg';
import type { FeedbackRating, FeedbackReason, MessageFeedback } from '../../services/feedback'
import styles from './ChatMessage.module.css'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  onOptionClick?: (messageId: string, option: string) => void
  messageId?: string
  feedback?: MessageFeedback | null
  onFeedback?: (messageId: string, rating: FeedbackRating, reasons?: FeedbackReason[]) => void
  onRemoveFeedback?: (messageId: string) => void
}

marked.setOptions({ breaks: true })

const sanitize = (dirty: string): string =>
  DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['table', 'thead', 'tbody', 'th', 'td', 'tr', 'code', 'pre', 'video', 'iframe', 'a', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'hr', 'blockquote', 'b', 'i'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'controls', 'colspan', 'rowspan'],
  })

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

/** Memoized message body – isolates video/iframe DOM from feedback state changes */
const MessageBody = memo(function MessageBody({ content }: { content: string }) {
  const parts = useMemo(() => {
    const html = marked.parse(content) as string
    const processed = convertYouTubeVideos(html)
    return parseContent(processed).map((part) =>
      part.type === 'html' ? { ...part, value: sanitize(part.value) } : part
    )
  }, [content])

  return (
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
  )
})

const REASON_OPTIONS: Array<{ value: FeedbackReason; label: string }> = [
  { value: 'wrong_answer', label: 'Wrong answer' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'off_topic', label: 'Off-topic' },
]

const ChatMessage = memo(function ChatMessage({ role, content, options, onOptionClick, messageId, feedback, onFeedback, onRemoveFeedback }: ChatMessageProps) {
  const isUser = role === 'user'
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<FeedbackReason[]>([])

  const isTempId = messageId?.startsWith('a-') || messageId?.startsWith('u-')
  const showFeedback = !isUser && onFeedback && !isTempId

  const handleThumbsUp = useCallback(() => {
    if (!onFeedback || !messageId) return
    if (feedback?.rating === 'up') {
      onRemoveFeedback?.(messageId)
    } else {
      setShowReasonPicker(false)
      onFeedback(messageId, 'up')
    }
  }, [onFeedback, onRemoveFeedback, feedback?.rating, messageId])

  const handleThumbsDown = useCallback(() => {
    if (!onFeedback || !messageId) return
    if (feedback?.rating === 'down') {
      setShowReasonPicker(false)
      onRemoveFeedback?.(messageId)
    } else {
      setSelectedReasons([])
      setShowReasonPicker(true)
    }
  }, [onFeedback, onRemoveFeedback, feedback?.rating, messageId])

  const toggleReason = useCallback((reason: FeedbackReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    )
  }, [])

  const handleSubmitFeedback = useCallback(() => {
    if (!messageId) return
    onFeedback?.(messageId, 'down', selectedReasons)
    setShowReasonPicker(false)
  }, [onFeedback, messageId, selectedReasons])

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}>
      {!isUser && (
          <img src={XBO} alt="" className={styles.avatar} />
      )}
      <div className={styles.messageContent}>
        <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
          {isUser ? (
            <span className={styles.userText}>{content}</span>
          ) : (
            <>
              <MessageBody content={content} />
              {options && options.length > 0 && (
                <div className={styles.optionsRow}>
                  {options.map((option) => (
                    <button
                      key={option}
                      onClick={() => onOptionClick?.(messageId!, option)}
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
        {showFeedback && (
          <div className={styles.feedbackRow} data-has-feedback={!!feedback}>
            <button
              className={`${styles.feedbackBtn} ${feedback?.rating === 'up' ? styles.feedbackBtnActiveUp : ''}`}
              onClick={handleThumbsUp}
              aria-label="Thumbs up"
              title="Helpful"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
            </button>
            <button
              className={`${styles.feedbackBtn} ${feedback?.rating === 'down' ? styles.feedbackBtnActiveDown : ''}`}
              onClick={handleThumbsDown}
              aria-label="Thumbs down"
              title="Not helpful"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
            </button>
          </div>
        )}
      </div>
      {showReasonPicker && createPortal(
        <div className={styles.reasonOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowReasonPicker(false) }}>
          <div className={styles.reasonDialog}>
            <button className={styles.reasonCloseBtn} onClick={() => setShowReasonPicker(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <div className={styles.reasonTitle}>What went wrong?</div>
            <div className={styles.reasonMessage}>Select a reason to help us improve</div>
            <div className={styles.reasonChips}>
              {REASON_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  className={`${styles.reasonChip} ${selectedReasons.includes(r.value) ? styles.reasonChipSelected : ''}`}
                  onClick={() => toggleReason(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className={styles.reasonActions}>
              <button className={styles.reasonCancelBtn} onClick={() => setShowReasonPicker(false)}>Cancel</button>
              <button
                className={styles.reasonSubmitBtn}
                disabled={selectedReasons.length === 0}
                onClick={handleSubmitFeedback}
              >
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})

export default ChatMessage
