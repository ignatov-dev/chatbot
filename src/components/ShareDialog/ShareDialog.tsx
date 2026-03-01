import { useState, useEffect, useRef } from 'react'
import styles from './ShareDialog.module.css'

const EXPIRATION_OPTIONS: { label: string; hours?: number }[] = [
  ...(import.meta.env.DEV ? [{ label: '5 minutes', hours: 5 / 60 }] : []),
  { label: '1 hour', hours: 1 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: 'No expiration' },
]

interface ShareDialogProps {
  isShared: boolean
  allowedShareHours: number[]
  onShare: (hours?: number) => void
  onCopyLink: () => void
  onRevoke: () => void
  onCancel: () => void
  pushSupported?: boolean
  pushSubscribed?: boolean
  pushLoading?: boolean
  onEnablePush?: () => void
}

export default function ShareDialog({ isShared, allowedShareHours, onShare, onCopyLink, onRevoke, onCancel, pushSupported, pushSubscribed, pushLoading, onEnablePush }: ShareDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const options = EXPIRATION_OPTIONS.filter((opt) => {
    if (opt.hours === undefined) return allowedShareHours.includes(0)
    return allowedShareHours.includes(Math.round(opt.hours))
  })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={(e) => { if (e.target === overlayRef.current) onCancel() }}
    >
      <div className={styles.dialog}>
        <div className={styles.title}>Share conversation</div>
        <div className={styles.message}>
          Choose how long the share link should remain active:
        </div>
        <div className={styles.options}>
          {options.map((opt, i) => (
            <button
              key={opt.label}
              className={`${styles.optionBtn} ${i === selectedIndex ? styles.optionBtnActive : ''}`}
              onClick={() => setSelectedIndex(i)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {pushSupported && (
          <label className={styles.notifyRow}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className={styles.notifyIcon}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span className={styles.notifyLabel}>Notify when opened</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!pushSubscribed}
              disabled={pushLoading}
              className={`${styles.toggle} ${pushSubscribed ? styles.toggleOn : ''}`}
              onClick={() => onEnablePush?.()}
            >
              <span className={styles.toggleThumb} />
            </button>
          </label>
        )}
        <div className={styles.actions}>
          {isShared && (
            <button className={styles.revokeBtn} onClick={onRevoke}>
              Revoke access
            </button>
          )}
          <button className={styles.copyLinkBtn} onClick={() => {
            const selected = options[selectedIndex]
            if (isShared) {
              onCopyLink()
            } else {
              onShare(selected?.hours)
            }
          }}>
            Copy link
          </button>
        </div>
      </div>
    </div>
  )
}
