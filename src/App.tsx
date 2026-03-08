import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { useSmartlook } from './hooks/useSmartlook'
import { useAutocompleteSuggestions } from './hooks/useAutocompleteSuggestions'
import AdminConfig from './components/AdminConfig'
import Tooltip from './components/Tooltip'
import FeedbackButton, { type FeedbackButtonHandle } from './components/FeedbackButton'
import { askClaude } from './services/chat';
import {
  upsertFeedback,
  deleteFeedback,
  fetchFeedbackForMessages,
  type FeedbackRating,
  type FeedbackReason,
  type MessageFeedback,
} from './services/feedback';
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

export default function App() {
  const { user, loading, signOut } = useAuth()
  useSmartlook(user)
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
  const { isAdmin, allowedSources, allowedShareHours, suggestions } = useAuth()
  const autocompleteSuggestions = useAutocompleteSuggestions()
  const location = useLocation()
  const navigate = useNavigate()
  const showConfig = isAdmin && location.pathname === '/config'

  // Redirect non-admins away from /config
  useEffect(() => {
    if (!isAdmin && location.pathname === '/config') {
      navigate('/', { replace: true })
    }
  }, [isAdmin, location.pathname, navigate])

  const effectiveSources = useMemo(
    () => allowedSources.length > 0 ? allowedSources : undefined,
    [allowedSources],
  )
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const skipFetchRef = useRef(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const feedbackRef = useRef<FeedbackButtonHandle>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, MessageFeedback>>({})
  const { hasViewers, revoke: revokeViewers } = useSharedViewers(activeConversationId)
  const { notifications: accessRequests, approve: approveRequest, deny: denyRequest } = useAccessRequestNotifications(user.id)
  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, toggle: togglePush } = usePushNotifications()

  // Load conversations on mount
  useEffect(() => {
    setIsLoadingConversations(true)
    fetchConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setIsLoadingConversations(false))
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }
    if (!activeConversationId) {
      setMessages([])
      setFeedbackMap({})
      return
    }
    fetchMessages(activeConversationId)
      .then((msgs) => {
        setMessages(msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })))
        const assistantIds = msgs.filter((m) => m.role === 'assistant').map((m) => m.id)
        if (assistantIds.length > 0) {
          fetchFeedbackForMessages(assistantIds).then(setFeedbackMap).catch(console.error)
        } else {
          setFeedbackMap({})
        }
      })
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

  const handleSend = useCallback(
    async (userText: string) => {
      let convId = activeConversationId

      // Create conversation if needed
      if (!convId) {
        const title = userText.length > 50 ? userText.slice(0, 50) + '...' : userText
        convId = await createConversation('general', title)
        skipFetchRef.current = true
        setActiveConversationId(convId)
      }

      // Show user message immediately
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: userText,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Persist user message
      saveMessage(convId, 'user', userText).catch(console.error)

      const historyForApi = messages.map(({ role, content }) => ({ role, content }))

      try {
        const result = await askClaude(userText, effectiveSources, historyForApi)
        const dbId = await saveMessage(convId, 'assistant', result.answer)
        setMessages((prev) => [
          ...prev,
          { id: dbId, role: 'assistant', content: result.answer, options: result.options, created_at: new Date().toISOString() },
        ])
        fetchConversations().then(setConversations).catch(console.error)
      } catch (err) {
        console.error('Chat error:', err)
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId, effectiveSources, messages],
  )

  const handleSuggestionClick = useCallback((text: string) => {
    handleSend(text)
  }, [handleSend])

  const handleFeedback = useCallback(async (messageId: string, rating: FeedbackRating, reasons?: FeedbackReason[]) => {
    let prev: MessageFeedback | undefined
    // Optimistic update
    setFeedbackMap((m) => {
      prev = m[messageId]
      return { ...m, [messageId]: { message_id: messageId, rating, reasons: reasons ?? null } }
    })
    try {
      await upsertFeedback(messageId, rating, reasons)
    } catch {
      // Rollback
      setFeedbackMap((m) => {
        if (prev) return { ...m, [messageId]: prev }
        const { [messageId]: _, ...rest } = m
        return rest
      })
    }
  }, [])

  const handleRemoveFeedback = useCallback(async (messageId: string) => {
    let prev: MessageFeedback | undefined
    // Optimistic remove
    setFeedbackMap((m) => {
      prev = m[messageId]
      const { [messageId]: _, ...rest } = m
      return rest
    })
    try {
      await deleteFeedback(messageId)
    } catch {
      setFeedbackMap((m) => prev ? { ...m, [messageId]: prev } : m)
    }
  }, [])

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
            style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)', flex: 1 }}
          >
            <AdminConfig onBack={() => navigate('/')} />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            className={styles.chatLayout}
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
              onDeleteConversation={(id) => { setDeleteConfirmId(id); setSidebarOpen(false) }}
              onPinConversation={handlePinConversation}
              onSignOut={onSignOut}
              userEmail={user.email ?? ''}
              isOpen={sidebarOpen}
              isLoading={isLoadingConversations}
              isAdmin={isAdmin}
              onOpenConfig={isAdmin ? () => { navigate('/config'); setSidebarOpen(false) } : undefined}
              onNewChat={(activeConversationId || messages.length > 0) ? () => { handleNewConversation(); setSidebarOpen(false) } : undefined}
              onShare={(activeConversationId && allowedShareHours.length > 0) ? () => { handleShareClick(); setSidebarOpen(false) } : undefined}
              canShare={!!activeConversationId && allowedShareHours.length > 0}
              hasViewers={hasViewers}
              onFeedback={() => { feedbackRef.current?.open(); setSidebarOpen(false) }}
              onClose={() => setSidebarOpen(false)}
            />

            <main className={styles.mainColumn}>
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.headerRow}>
                  <img src={XBO} alt="" className={styles.logo} />
                  <div className={styles.headerInfo}>
                    <div className={styles.headerTitle}>
                      {activeConversationId
                        ? conversations.find((c) => c.id === activeConversationId)?.title ?? 'New conversation'
                        : 'New conversation'}
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.statusDot} />
                      Online
                    </div>
                  </div>
                  {activeConversationId && (
                    <Tooltip text="Delete conversation">
                      <button
                        onClick={() => setDeleteConfirmId(activeConversationId)}
                        aria-label="Delete conversation"
                        className={styles.deleteBtn}
                      >
                        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </Tooltip>
                  )}
                  {activeConversationId && allowedShareHours.length > 0 && (
                    <Tooltip text={hasViewers ? 'Someone is viewing' : 'Share conversation'}>
                      <button
                        onClick={handleShareClick}
                        aria-label="Share conversation"
                        className={hasViewers ? styles.shareActiveBtn : styles.newChatBtn}
                      >
                        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3v11.25" /></svg>
                      </button>
                    </Tooltip>
                  )}
                  {(activeConversationId || messages.length > 0) && (
                    <Tooltip text="New chat">
                      <button
                        onClick={handleNewConversation}
                        aria-label="New chat"
                        className={styles.newChatBtn}
                      >
                        <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor" aria-hidden="true"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                      </button>
                    </Tooltip>
                  )}
                  <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                    ☰
                  </button>
                </div>

              </div>

              {/* Messages */}
              <div className={styles.messagesArea}>
                <ChatWindow messages={messages} isLoading={isLoading} themeLabel="XBO" onOptionClick={handleOptionClick} suggestions={suggestions} onSuggestionClick={handleSuggestionClick} feedbackMap={feedbackMap} onFeedback={handleFeedback} onRemoveFeedback={handleRemoveFeedback} />
              </div>

              {/* Input */}
              <ChatInput onSend={handleSend} disabled={isLoading} placeholder="XBO" focusTrigger={activeConversationId} autocompleteSuggestions={autocompleteSuggestions} />
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

      <FeedbackButton ref={feedbackRef} onToast={showToast} />
    </>
  )
}
