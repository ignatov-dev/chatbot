import { useState, useEffect } from 'react'
import { fetchSharedConversation, type DbMessage } from '../services/conversations'
import { supabase } from '../lib/supabase'

export function useSharedConversation(id: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [notFound, setNotFound] = useState(false)

  // Fetch initial conversation data
  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    fetchSharedConversation(id)
      .then((result) => {
        if (!result) {
          setNotFound(true)
        } else {
          setTitle(result.conversation.title)
          setMessages(result.messages)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!id || notFound) return

    const channel = supabase
      .channel(`shared-conversation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as DbMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, notFound])

  return { loading, title, messages, notFound }
}
