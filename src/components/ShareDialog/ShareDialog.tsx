import { useEffect, useRef } from 'react'
import styles from './ShareDialog.module.css'

const EXPIRATION_OPTIONS: { label: string; hours?: number }[] = [
  { label: '1 hour', hours: 1 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: 'No expiration' },
]

interface ShareDialogProps {
  isShared: boolean
  onSelect: (hours?: number) => void
  onRevoke: () => void
  onCancel: () => void
}

export default function ShareDialog({ isShared, onSelect, onRevoke, onCancel }: ShareDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

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
          {EXPIRATION_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={styles.optionBtn}
              onClick={() => onSelect(opt.hours)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          {isShared && (
            <button className={styles.revokeBtn} onClick={onRevoke}>
              Revoke access
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
