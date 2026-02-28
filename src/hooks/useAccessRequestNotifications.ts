import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchPendingRequests,
  approveAccessRequest,
  denyAccessRequest,
  type AccessRequest,
} from '../services/accessRequests'
import { playNotificationSound } from '../utils/notificationSound'

export interface AccessRequestNotification {
  id: string
  conversationId: string
  conversationTitle: string
  createdAt: string
}

function toNotification(req: AccessRequest): AccessRequestNotification {
  return {
    id: req.id,
    conversationId: req.conversation_id,
    conversationTitle: req.conversation_title,
    createdAt: req.created_at,
  }
}

export function useAccessRequestNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AccessRequestNotification[]>([])

  // Fetch pending requests on mount (catches requests while owner was offline)
  useEffect(() => {
    if (!userId) return
    fetchPendingRequests()
      .then((reqs) => setNotifications(reqs.map(toNotification)))
      .catch(console.error)
  }, [userId])

  // Listen for new access requests in real-time
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('access-requests-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'access_requests',
        },
        async (payload) => {
          const row = payload.new as {
            id: string
            conversation_id: string
            status: string
            created_at: string
          }
          if (row.status !== 'pending') return

          // Fetch conversation title — RLS ensures we can only read our own
          const { data: conv } = await supabase
            .from('conversations')
            .select('title')
            .eq('id', row.conversation_id)
            .single()

          if (conv) {
            playNotificationSound()
            setNotifications((prev) => {
              // Avoid duplicates
              if (prev.some((n) => n.id === row.id)) return prev
              return [
                {
                  id: row.id,
                  conversationId: row.conversation_id,
                  conversationTitle: conv.title,
                  createdAt: row.created_at,
                },
                ...prev,
              ]
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const approve = useCallback(
    async (conversationId: string, durationHours?: number) => {
      await approveAccessRequest(conversationId, durationHours)

      // Remove all notifications for this conversation
      setNotifications((prev) =>
        prev.filter((n) => n.conversationId !== conversationId),
      )

      // Broadcast to viewers that access is restored
      const channel = supabase.channel(`restore:${conversationId}`)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'access_restored',
            payload: {},
          })
          setTimeout(() => supabase.removeChannel(channel), 1000)
        }
      })
    },
    [],
  )

  const deny = useCallback(async (requestId: string) => {
    await denyAccessRequest(requestId)
    setNotifications((prev) => prev.filter((n) => n.id !== requestId))
  }, [])

  return { notifications, approve, deny }
}
