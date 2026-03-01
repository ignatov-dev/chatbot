import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import ChatWindow, { type Message } from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import ConversationSidebar from './components/ConversationSidebar'
import ConfirmDialog from './components/ConfirmDialog'
import ShareDialog from './components/ShareDialog'
import AccessRequestNotification from './components/AccessRequestNotification/AccessRequestNotification'
import { useSharedViewers } from './hooks/useSharedViewers'
import { useAccessRequestNotifications } from './hooks/useAccessRequestNotifications'
import { usePushNotifications } from './hooks/usePushNotifications'
import AuthForm from './components/AuthForm'
import { useAuth } from './contexts/AuthContext'
import AdminConfig from './components/AdminConfig'
import { askClaude } from './services/chat';
import XBO from '/XBO.svg';
import styles from './App.module.css'
import { AnimatePresence, motion } from 'framer-motion'
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  saveMessage,
  deleteConversation,
  pinConversation,
  shareConversation,
  unshareConversation,
  type ConversationSummary,
} from './services/conversations'

export const THEMES = [
  { label: 'CryptoPayX', sources: ['cryptopayx_api_documentation.txt'] },
  { label: 'Deposit & Withdrawal', sources: ['deposit-and-withdrawals.txt'] },
  { label: 'Verification', sources: ['verification.txt'] },
  { label: 'Loyalty Program', sources: ['loyalty-program.txt'] },
  { label: 'Q & A', sources: ['questions.txt'] },
  { label: 'Learn', sources: ['what_is_a_crypto_exchange.txt'] },
]

export default function App() {
  const { user, loading, signOut } = useAuth()
  const [view, setView] = useState<'auth' | 'auth-exit' | 'chat' | 'chat-exit'>(user ? 'chat' : 'auth')
  const [animateChat, setAnimateChat] = useState(false)
  const [animateAuth, setAnimateAuth] = useState(false)
  const prevUserRef = useRef(user)
  const hasResolvedAuth = useRef(false)

  const handleSignOut = useCallback(() => {
    setView('chat-exit')
    setTimeout(() => {
      setView('auth')
      setAnimateAuth(true)
      signOut()
    }, 400)
  }, [signOut])

  useEffect(() => {
    if (loading) return
    const isFirstResolve = !hasResolvedAuth.current
    hasResolvedAuth.current = true

    const wasSignedOut = !prevUserRef.current
    prevUserRef.current = user

    if (user && wasSignedOut) {
      if (isFirstResolve) {
        setView('chat')
        return
      }
      setView('auth-exit')
      setAnimateChat(true)
      const timer = setTimeout(() => setView('chat'), 400)
      return () => clearTimeout(timer)
    }
    if (!user && view !== 'auth') {
      setView('auth')
      setAnimateChat(false)
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading...
      </div>
    )
  }

  if (view === 'auth') {
    return animateAuth
      ? <main className="auth-enter" onAnimationEnd={() => setAnimateAuth(false)}><AuthForm /></main>
      : <main><AuthForm /></main>
  }

  if (view === 'auth-exit') {
    return (
      <main className="auth-exit">
        <AuthForm />
      </main>
    )
  }

  if (view === 'chat-exit') {
    return (
      <div className="app-shell chat-exit">
        <AuthenticatedApp user={user!} onSignOut={handleSignOut} />
      </div>
    )
  }

  return (
    <div className={`app-shell${animateChat ? ' chat-enter' : ''}`} onAnimationEnd={() => setAnimateChat(false)}>
      <AuthenticatedApp user={user!} onSignOut={handleSignOut} />
    </div>
  )
}

function AuthenticatedApp({
  user,
  onSignOut,
}: {
  user: { id: string; email?: string }
  onSignOut: () => void
}) {
  const { isAdmin, allowedSources, allowedShareHours } = useAuth()
  const [showConfig, setShowConfig] = useState(false)
  const [activeTheme, setActiveTheme] = useState(0)

  const visibleThemes = useMemo(
    () => allowedSources.length > 0
      ? THEMES.filter((t) => t.sources.some((s) => allowedSources.includes(s)))
      : THEMES,
    [allowedSources],
  )
  const currentTheme = visibleThemes[activeTheme] ?? visibleThemes[0]
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const skipFetchRef = useRef(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const { hasViewers, revoke: revokeViewers } = useSharedViewers(activeConversationId)
  const { notifications: accessRequests, approve: approveRequest, deny: denyRequest } = useAccessRequestNotifications(user.id)
  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, toggle: togglePush } = usePushNotifications()

  // Reset theme index when visible themes change
  useEffect(() => {
    setActiveTheme(0)
    setActiveConversationId(null)
    setMessages([])
  }, [visibleThemes])

  // Load conversations on mount and when theme changes
  useEffect(() => {
    if (!currentTheme) return
    setIsLoadingConversations(true)
    fetchConversations(currentTheme.sources)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setIsLoadingConversations(false))
  }, [activeTheme])

  // Load messages when conversation changes
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }
    if (!activeConversationId) {
      setMessages([])
      return
    }
    fetchMessages(activeConversationId)
      .then((msgs) =>
        setMessages(msgs.map((m) => ({ id: m.id, role: m.role, content: m.content }))),
      )
      .catch(console.error)
  }, [activeConversationId])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const handleShareClick = useCallback(() => {
    if (!activeConversationId) return
    setShowShareDialog(true)
  }, [activeConversationId])

  const handleShareSelect = useCallback((hours?: number) => {
    if (!activeConversationId) return
    setShowShareDialog(false)
    // Write clipboard synchronously within the gesture using ClipboardItem with
    // a deferred blob promise — this preserves the user-gesture context on iOS Safari.
    const textPromise = shareConversation(activeConversationId, hours).then(
      (url) => {
        setConversations((prev) =>
          prev.map((c) => c.id === activeConversationId ? { ...c, is_shared: true } : c),
        )
        return new Blob([url], { type: 'text/plain' })
      },
    )
    navigator.clipboard
      .write([new ClipboardItem({ 'text/plain': textPromise })])
      .then(() => showToast('Link copied to clipboard!'))
      .catch(() => showToast('Failed to share conversation'))
  }, [activeConversationId, showToast])

  const handleRevoke = useCallback(async () => {
    if (!activeConversationId) return
    setShowShareDialog(false)
    try {
      await unshareConversation(activeConversationId)
      await revokeViewers()
      setConversations((prev) =>
        prev.map((c) => c.id === activeConversationId ? { ...c, is_shared: false } : c),
      )
      showToast('Share link revoked')
    } catch {
      showToast('Failed to revoke share link')
    }
  }, [activeConversationId, showToast, revokeViewers])

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id)
    if (activeConversationId === id) {
      setActiveConversationId(null)
      setMessages([])
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  const handlePinConversation = useCallback(async (id: string, pinned: boolean) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_pinned: pinned } : c)),
    )
    try {
      await pinConversation(id, pinned)
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_pinned: !pinned } : c)),
      )
    }
  }, [])

  const handleThemeChange = (index: number) => {
    if (index === activeTheme) return
    setActiveTheme(index)
    setActiveConversationId(null)
    setMessages([])
    // conversations reload via useEffect on activeTheme
  }

  const handleSend = useCallback(
    async (userText: string) => {
      let convId = activeConversationId

      // Create conversation if needed
      if (!convId) {
        const title = userText.length > 50 ? userText.slice(0, 50) + '...' : userText
        convId = await createConversation(currentTheme.sources[0], title)
        skipFetchRef.current = true
        setActiveConversationId(convId)
      }

      // Show user message immediately
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: userText,
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Persist user message
      saveMessage(convId, 'user', userText).catch(console.error)

      try {
        const history = messages.map(({ role, content }) => ({ role, content }))
        const response = await askClaude(userText, currentTheme.sources, history)
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          options: response.options,
        }
        setMessages((prev) => [...prev, assistantMsg])

        // Persist assistant message (text only, options are transient)
        saveMessage(convId, 'assistant', response.answer).catch(console.error)
      } catch (err) {
        console.error('Chat error:', err)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          },
        ])
      } finally {
        setIsLoading(false)
      }

      // Refresh sidebar
      fetchConversations(currentTheme.sources).then(setConversations).catch(console.error)
    },
    [activeConversationId, activeTheme, messages],
  )

  const handleOptionClick = useCallback(
    (messageId: string, option: string) => {
      // Remove pills from the message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, options: undefined } : msg,
        ),
      )
      // Send the selected option as a user message
      handleSend(option)
    },
    [handleSend],
  )

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {showConfig ? (
          <motion.div
            key="config"
            className={styles.mainColumn}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <AdminConfig onBack={() => setShowConfig(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            style={{ display: 'flex', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <ConversationSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => { setActiveConversationId(id); setSidebarOpen(false) }}
              onDeleteConversation={(id) => setDeleteConfirmId(id)}
              onPinConversation={handlePinConversation}
              onSignOut={onSignOut}
              userEmail={user.email ?? ''}
              isOpen={sidebarOpen}
              isLoading={isLoadingConversations}
              isAdmin={isAdmin}
              onOpenConfig={() => { setShowConfig(true); setSidebarOpen(false) }}
            />

            <main className={styles.mainColumn}>
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.headerRow}>
                  <img src={XBO} alt="" className={styles.logo} />
                  <div className={styles.headerInfo}>
                    <div className={styles.headerTitle}>
                      <span className={styles.headerThemeLabel}>{currentTheme.label} </span>Assistant
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.statusDot} />
                      Online
                    </div>
                  </div>
                  {activeConversationId && (
                    <button
                      onClick={() => setDeleteConfirmId(activeConversationId)}
                      aria-label="Delete conversation"
                      title="Delete conversation"
                      className={styles.deleteBtn}
                    >
                      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  {activeConversationId && allowedShareHours.length > 0 && (
                    <button
                      onClick={handleShareClick}
                      aria-label="Share conversation"
                      title={hasViewers ? 'Someone is viewing this conversation' : 'Share conversation'}
                      className={hasViewers ? styles.shareActiveBtn : styles.newChatBtn}
                    >
                      <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor" aria-hidden="true"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /></svg>
                    </button>
                  )}
                  {(activeConversationId || messages.length > 0) && (
                    <button
                      onClick={handleNewConversation}
                      aria-label="New chat"
                      className={styles.newChatBtn}
                    >
                      <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor" aria-hidden="true"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                    </button>
                  )}
                  <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                    ☰
                  </button>
                </div>

              </div>

              {/* Theme tabs */}
              <div className={`${styles.themeTabs} theme-tabs`}>
                {visibleThemes.map((theme, i) => (
                  <button
                    key={theme.label}
                    onClick={() => handleThemeChange(i)}
                    className={`${styles.themeTab}${i === activeTheme ? ` ${styles.themeTabActive}` : ''}`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className={styles.messagesArea}>
                <ChatWindow messages={messages} isLoading={isLoading} themeLabel={currentTheme.label} onOptionClick={handleOptionClick} />
              </div>

              {/* Input */}
              <ChatInput onSend={handleSend} disabled={isLoading} placeholder={currentTheme.label} />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete conversation"
          message="This conversation will be permanently deleted. This action cannot be undone."
          onConfirm={() => {
            handleDeleteConversation(deleteConfirmId)
            setDeleteConfirmId(null)
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {showShareDialog && (
        <ShareDialog
          isShared={(() => {
            const c = conversations.find((c) => c.id === activeConversationId)
            if (!c?.is_shared) return false
            if (c.shared_expires_at && new Date(c.shared_expires_at) <= new Date()) return false
            return true
          })()}
          allowedShareHours={allowedShareHours}
          onShare={handleShareSelect}
          onCopyLink={() => {
            if (!activeConversationId) return
            const url = `${window.location.origin}/conversation/${activeConversationId}`
            navigator.clipboard.writeText(url)
              .then(() => showToast('Link copied to clipboard!'))
              .catch(() => showToast('Failed to copy link'))
            setShowShareDialog(false)
          }}
          onRevoke={handleRevoke}
          onCancel={() => setShowShareDialog(false)}
          pushSupported={pushSupported}
          pushSubscribed={pushSubscribed}
          pushLoading={pushLoading}
          onEnablePush={togglePush}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.toast}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.accessRequestStack}>
        <AnimatePresence>
          {accessRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AccessRequestNotification
                conversationTitle={req.conversationTitle}
                allowedShareHours={allowedShareHours}
                onApprove={(hours) => approveRequest(req.conversationId, hours)}
                onDeny={() => denyRequest(req.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
