import { useState, useCallback, useEffect, useRef } from 'react'
import ChatWindow, { type Message } from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import ConversationSidebar from './components/ConversationSidebar'
import AuthForm from './components/AuthForm'
import { useAuth } from './contexts/AuthContext'
import { RiRobot2Line } from 'react-icons/ri'
import { askClaude } from './services/chat'
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  saveMessage,
  deleteConversation,
  type ConversationSummary,
} from './services/conversations'

const THEMES = [
  // { label: 'XBO Token', sources: ['xbo-token-guide.pdf'] },
  // { label: 'XBO CryptoPay', sources: ['xbo-cryptopay-guide.pdf'] },
  { label: 'CryptoPayX', sources: ['cryptopayx_api_documentation.txt'] },
  { label: 'Deposit & Withdrawal', sources: ['deposit-and-withdrawals.txt'] },
  { label: 'Vefification', sources: ['verification.txt'] },
  { label: 'Loyalty Program', sources: ['loyalty-program.txt'] },
  // { label: 'All Products', sources: ['xbo-token-guide.pdf', 'xbo-cryptopay-guide.pdf'] },
]

export default function App() {
  const { user, loading, signOut } = useAuth()

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

  if (!user) {
    return <AuthForm />
  }

  return <AuthenticatedApp user={user} onSignOut={signOut} />
}

function AuthenticatedApp({
  user,
  onSignOut,
}: {
  user: { id: string; email?: string }
  onSignOut: () => Promise<void>
}) {
  const [activeTheme, setActiveTheme] = useState(0)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const skipFetchRef = useRef(false)

  // Load conversations on mount and when theme changes
  useEffect(() => {
    fetchConversations(THEMES[activeTheme].sources).then(setConversations).catch(console.error)
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
        const answer = await askClaude(userText, THEMES[activeTheme].sources, history)
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: answer,
        }
        setMessages((prev) => [...prev, assistantMsg])

        // Persist assistant message
        saveMessage(convId, 'assistant', answer).catch(console.error)
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
    [activeConversationId, activeTheme],
  )

  return (
    <>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onSignOut={onSignOut}
        userEmail={user.email ?? ''}
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
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#4f2dd0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              <RiRobot2Line size={20} />
            </div>
            <div>
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
          </div>

          {/* Theme tabs */}
          <div
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
          <ChatWindow messages={messages} isLoading={isLoading} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} placeholder={THEMES[activeTheme].label} />
      </div>
    </>
  )
}
