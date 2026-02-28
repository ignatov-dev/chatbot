import { useState } from 'react'
import styles from './AccessRequestNotification.module.css'

const DURATION_OPTIONS: { label: string; hours?: number }[] = [
  ...(import.meta.env.DEV ? [{ label: '5m', hours: 5 / 60 }] : []),
  { label: '1h', hours: 1 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: 'No limit' },
]

interface AccessRequestNotificationProps {
  conversationTitle: string
  onApprove: (hours?: number) => void
  onDeny: () => void
}

export default function AccessRequestNotification({
  conversationTitle,
  onApprove,
  onDeny,
}: AccessRequestNotificationProps) {
  const [selectedHours, setSelectedHours] = useState<number | undefined>(undefined)

  return (
    <div className={styles.notification}>
      <span className={styles.message}>
        &#128275; Access requested for <strong>{conversationTitle}</strong>
      </span>
      <div className={styles.right}>
        <div className={styles.durationPicker}>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`${styles.durationBtn} ${selectedHours === opt.hours ? styles.durationBtnActive : ''}`}
              onClick={() => setSelectedHours(opt.hours)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.denyBtn} onClick={onDeny}>Deny</button>
          <button className={styles.allowBtn} onClick={() => onApprove(selectedHours)}>Allow</button>
        </div>
      </div>
    </div>
  )
}
