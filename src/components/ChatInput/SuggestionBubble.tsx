import { motion } from 'framer-motion'
import styles from './SuggestionBubble.module.css'

interface SuggestionBubbleProps {
  text: string
  onClick: () => void
}

export default function SuggestionBubble({ text, onClick }: SuggestionBubbleProps) {
  return (
    <motion.button
      className={styles.bubble}
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      type="button"
    >
      <svg viewBox="0 0 20 20" width={14} height={14} fill="currentColor" className={styles.icon} aria-hidden="true">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
      </svg>
      <span className={styles.text}>{text}</span>
    </motion.button>
  )
}
