import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { submitFeedback } from '../../services/userFeedback'
import styles from './FeedbackButton.module.css'

export interface FeedbackButtonHandle {
  open: () => void
}

const FeedbackButton = forwardRef<FeedbackButtonHandle, { onToast: (msg: string) => void }>(({ onToast }, ref) => {
  const [open, setOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }), [])
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const reset = useCallback(() => {
    setRating(0)
    setHoverRating(0)
    setMessage('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (rating === 0 && !message.trim()) return
    setSubmitting(true)
    try {
      await submitFeedback(rating, message.trim() || undefined)
      setOpen(false)
      reset()
      onToast('Thanks for your feedback!')
    } catch {
      onToast('Failed to send feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [rating, message, reset, onToast])

  return (
    <>
      <button
        className={styles.floatingBtn}
        onClick={() => setOpen(true)}
        aria-label="Leave feedback"
      >
        <svg className={styles.floatingBtnIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </svg>
        <span className={styles.floatingBtnLabel}>Feedback</span>
      </button>

      {open && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div className={styles.dialog}>
            <div className={styles.title}>How's your experience?</div>
            <div className={styles.subtitle}>Your feedback helps us improve the chatbot.</div>

            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`${styles.star} ${n <= (hoverRating || rating) ? styles.starActive : ''}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Tell us what you think..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
            />

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => { setOpen(false); reset() }}>
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={submitting || (rating === 0 && !message.trim())}
              >
                {submitting ? 'Sending...' : 'Send feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

export default FeedbackButton
