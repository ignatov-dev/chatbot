import { useState, useCallback, useEffect, useRef } from 'react'
import ChatWindow, { type Message } from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import ConversationSidebar from './components/ConversationSidebar'
import AuthForm from './components/AuthForm'
import { useAuth } from './contexts/AuthContext'
import { HiMiniPencilSquare } from 'react-icons/hi2'
import { askClaude } from './services/chat';
import XBO from '/XBO.svg';
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  saveMessage,
  deleteConversation,
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#ffffff',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        Loading...
      </div>
    )
  }

  if (view === 'auth') {
    return animateAuth
      ? <div className="auth-enter" onAnimationEnd={() => setAnimateAuth(false)}><AuthForm /></div>
      : <AuthForm />
  }

  if (view === 'auth-exit') {
    return (
      <div className="auth-exit">
        <AuthForm />
      </div>
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

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id)
    if (activeConversationId === id) {
      setActiveConversationId(null)
      setMessages([])
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

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
        onDeleteConversation={handleDeleteConversation}
        onSignOut={onSignOut}
        userEmail={user.email ?? ''}
        isOpen={sidebarOpen}
        isLoading={isLoadingConversations}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              padding: '16px 20px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <img src={XBO} alt="" style={{ width: '32px', height: '32px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                {THEMES[activeTheme].label} Assistant
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                  }}
                />
                Online
              </div>
            </div>
            {(activeConversationId || messages.length > 0) && (
              <button
                onClick={handleNewConversation}
                aria-label="New chat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  color: '#374151',
                }}
              >
                <HiMiniPencilSquare size={18} />
              </button>
            )}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              ☰
            </button>
          </div>

          {/* Theme tabs */}
          <div
            className="theme-tabs"
            style={{
              display: 'flex',
              gap: '4px',
              padding: '0 16px 0',
            }}
          >
            {THEMES.map((theme, i) => (
              <button
                key={theme.label}
                onClick={() => handleThemeChange(i)}
                style={{
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: i === activeTheme ? 600 : 400,
                  border: 'none',
                  borderBottom: i === activeTheme ? '2px solid #4f2dd0' : '2px solid transparent',
                  background: 'transparent',
                  color: i === activeTheme ? '#4f2dd0' : '#6b7280',
                  cursor: 'pointer',
                  borderRadius: '0',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#f9fafb',
          }}
        >
          <ChatWindow messages={messages} isLoading={isLoading} onOptionClick={handleOptionClick} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} placeholder={THEMES[activeTheme].label} />
      </div>
    </>
  )
}
