import { useState, useEffect, useCallback } from 'react'
import { fetchSharedConversation, type DbMessage } from '../services/conversations'
import {
  checkSharedLinkStatus,
  getOrCreateFingerprint,
  submitAccessRequest,
} from '../services/accessRequests'
import { supabase } from '../lib/supabase'
import { playNotificationSound } from '../utils/notificationSound'

export type LinkStatus = 'loading' | 'active' | 'expired' | 'not_found'

export function useSharedConversation(id: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [notFound, setNotFound] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('loading')
  const [requestSent, setRequestSent] = useState(() => {
    if (!id) return false
    return localStorage.getItem(`access_requested_${id}`) === 'true'
  })
  const [requestLoading, setRequestLoading] = useState(false)

  // Fetch initial conversation data
  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLinkStatus('not_found')
      setLoading(false)
      return
    }
    fetchSharedConversation(id)
      .then(async (result) => {
        if (!result) {
          const status = await checkSharedLinkStatus(id)
          setLinkStatus(status)
          setNotFound(true)
        } else {
          setTitle(result.conversation.title)
          setMessages(result.messages)
          setExpiresAt(result.conversation.shared_expires_at)
          setLinkStatus('active')
        }
      })
      .catch(() => {
        setNotFound(true)
        setLinkStatus('not_found')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Auto-expire on the client when the expiration time is reached
  useEffect(() => {
    if (!expiresAt) return

    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) {
      setNotFound(true)
      setLinkStatus('expired')
      return
    }

    const timer = setTimeout(() => {
      setNotFound(true)
      setLinkStatus('expired')
    }, ms)
    return () => clearTimeout(timer)
  }, [expiresAt])

  // Broadcast presence so the conversation owner knows someone is viewing
  useEffect(() => {
    if (!id || notFound) return

    const channel = supabase.channel(`viewers:${id}`)
    channel
      .on('broadcast', { event: 'revoked' }, () => {
        setNotFound(true)
        setLinkStatus('not_found')
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

  // Listen for access_restored when link is expired (separate channel, no presence)
  useEffect(() => {
    if (!id || linkStatus !== 'expired') return

    const channel = supabase.channel(`restore:${id}`)
    channel
      .on('broadcast', { event: 'access_restored' }, () => {
        fetchSharedConversation(id).then((result) => {
          if (result) {
            setTitle(result.conversation.title)
            setMessages(result.messages)
            setExpiresAt(result.conversation.shared_expires_at)
            setLinkStatus('active')
            setNotFound(false)
            // Clear request state so viewer can request again if it expires again
            localStorage.removeItem(`access_requested_${id}`)
            localStorage.removeItem(`access_fp_${id}`)
            setRequestSent(false)
          }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, linkStatus])

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

  const requestAccess = useCallback(async () => {
    if (!id || requestSent || requestLoading) return
    setRequestLoading(true)
    try {
      const fingerprint = getOrCreateFingerprint(id)
      const result = await submitAccessRequest(id, fingerprint)
      if (result.success || result.alreadyRequested) {
        localStorage.setItem(`access_requested_${id}`, 'true')
        setRequestSent(true)
      }
    } finally {
      setRequestLoading(false)
    }
  }, [id, requestSent, requestLoading])

  return {
    loading,
    title,
    messages,
    notFound,
    linkStatus,
    requestSent,
    requestLoading,
    requestAccess,
  }
}
