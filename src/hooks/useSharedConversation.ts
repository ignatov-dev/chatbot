import { useState, useEffect } from 'react'
import { fetchSharedConversation, type DbMessage } from '../services/conversations'
import { supabase } from '../lib/supabase'
import { playNotificationSound } from '../utils/notificationSound'

export function useSharedConversation(id: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [notFound, setNotFound] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

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
          setExpiresAt(result.conversation.shared_expires_at)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-expire on the client when the expiration time is reached
  useEffect(() => {
    if (!expiresAt) return

    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) {
      setNotFound(true)
      return
    }

    const timer = setTimeout(() => setNotFound(true), ms)
    return () => clearTimeout(timer)
  }, [expiresAt])

  // Broadcast presence so the conversation owner knows someone is viewing
  useEffect(() => {
    if (!id || notFound) return

    const channel = supabase.channel(`viewers:${id}`)
    channel
      .on('broadcast', { event: 'revoked' }, () => {
        setNotFound(true)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, notFound])

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
          if (newMsg.role === 'assistant') playNotificationSound()
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
