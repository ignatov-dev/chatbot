import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './AuthForm.module.css'

export default function AuthForm() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (result.error) {
      setError(result.error)
    } else if ('confirmationRequired' in result && result.confirmationRequired) {
      setConfirmationSent(true)
    }
    setLoading(false)
  }

  return (
    <>
      {confirmationSent ? (
        <div className={styles.confirmationCard}>
          <div className={styles.confirmationIcon}>
            ✉
          </div>
          <h2 className={styles.confirmationTitle}>Check your email</h2>
          <p className={styles.confirmationText}>
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <button
            type="button"
            onClick={() => { setConfirmationSent(false); setIsSignUp(false); setError(null) }}
            className={styles.linkButton}
          >
            Back to Sign In
          </button>
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        className={styles.formCard}
      >
        <div className={styles.formHeader}>
          <img
            src="/XBO.svg"
            alt="XBO"
            className={styles.formLogo}
          />
          <h2 className={styles.formTitle}>
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className={styles.formSubtitle}>
            {isSignUp ? 'Sign up to start chatting' : 'Sign in to continue'}
          </p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroupLast}>
          <label className={styles.label}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={styles.input}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <div className={styles.dividerLine} />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setError(null)
            signInWithGoogle()
          }}
          className={styles.googleButton}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p className={styles.toggleText}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className={styles.linkButton}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        <p className={styles.termsText}>
          By continuing, you agree to our{' '}
          <a href="/privacy" className={styles.termsLink}>Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms" className={styles.termsLink}>Terms of Service</a>.
        </p>

        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={styles.guideButton}
        >
          Guide Tour
        </button>
      </form>
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </>
  )
}

function GuideModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    videoRef.current?.play().catch(() => {})
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className={styles.modalOverlay}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.modalContent}
      >
        <video
          ref={videoRef}
          src="/xbo-presentation-hq.mp4"
          controls
          className={styles.modalVideo}
        />
      </div>
    </div>
  )
}
