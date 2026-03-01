import { supabase } from '../lib/supabase'

/**
 * Notify the conversation owner that someone opened their shared link.
 * Fire-and-forget — errors are silently logged.
 */
export function notifySharedView(conversationId: string, viewerFingerprint: string): void {
  supabase.functions
    .invoke('send-push', {
      body: { conversation_id: conversationId, viewer_fingerprint: viewerFingerprint },
    })
    .catch((err) => console.warn('Push notify failed:', err))
}
