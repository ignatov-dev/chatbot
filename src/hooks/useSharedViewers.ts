import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** Tracks active viewers and exposes a revoke function to notify them. */
export function useSharedViewers(conversationId: string | null) {
  const [hasViewers, setHasViewers] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setHasViewers(false)
      return
    }

    const channel = supabase.channel(`viewers:${conversationId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setHasViewers(Object.keys(state).length > 0)
      })
      .subscribe()

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const revoke = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.send({ type: 'broadcast', event: 'revoked', payload: {} })
    }
  }, [])

  return { hasViewers, revoke }
}
