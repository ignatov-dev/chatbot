import { useState, useCallback, useEffect, useRef } from 'react'
import ChatWindow, { type Message } from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import ConversationSidebar from './components/ConversationSidebar'
import ConfirmDialog from './components/ConfirmDialog'
import AuthForm from './components/AuthForm'
import { useAuth } from './contexts/AuthContext'
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
  type ConversationSummary,
} from './services/conversations'

const THEMES = [
  { label: 'CryptoPayX', sources: ['cryptopayx_api_documentation.txt'] },
  { label: 'Deposit & Withdrawal', sources: ['deposit-and-withdrawals.txt'] },
  { label: 'Verification', sources: ['verification.txt'] },
  { label: 'Loyalty Program', sources: ['loyalty-program.txt'] },
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
  const [activeTheme, setActiveTheme] = useState(0)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const skipFetchRef = useRef(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Load conversations on mount and when theme changes
  useEffect(() => {
    setIsLoadingConversations(true)
    fetchConversations(THEMES[activeTheme].sources)
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

  const handleShare = useCallback(async () => {
    if (!activeConversationId) return
    try {
      const url = await shareConversation(activeConversationId)
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // Fallback for iOS Safari where clipboard API fails after async
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      showToast('Link copied to clipboard!')
    } catch {
      showToast('Failed to share conversation')
    }
  }, [activeConversationId, showToast])

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
        convId = await createConversation(THEMES[activeTheme].sources[0], title)
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
        const response = await askClaude(userText, THEMES[activeTheme].sources, history)
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
      fetchConversations(THEMES[activeTheme].sources).then(setConversations).catch(console.error)
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
      />

      <main className={styles.mainColumn}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <img src={XBO} alt="" className={styles.logo} />
            <div className={styles.headerInfo}>
              <div className={styles.headerTitle}>
                <span className={styles.headerThemeLabel}>{THEMES[activeTheme].label} </span>Assistant
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
            {activeConversationId && (
              <button
                onClick={handleShare}
                aria-label="Share conversation"
                title="Share conversation"
                className={styles.newChatBtn}
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

          {/* Theme tabs */}
          <div className={`${styles.themeTabs} theme-tabs`}>
            {THEMES.map((theme, i) => (
              <button
                key={theme.label}
                onClick={() => handleThemeChange(i)}
                className={`${styles.themeTab}${i === activeTheme ? ` ${styles.themeTabActive}` : ''}`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messagesArea}>
          <ChatWindow messages={messages} isLoading={isLoading} themeLabel={THEMES[activeTheme].label} onOptionClick={handleOptionClick} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} placeholder={THEMES[activeTheme].label} />
      </main>

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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={styles.toast}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
