import { useState, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Tooltip.module.css'

interface TooltipProps {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    })
    setVisible(true)
  }, [])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <span
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && createPortal(
        <span
          className={styles.bubble}
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  )
}
