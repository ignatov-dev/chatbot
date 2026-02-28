import { supabase } from '../lib/supabase'

export interface AccessRequest {
  id: string
  conversation_id: string
  conversation_title: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

export async function checkSharedLinkStatus(
  conversationId: string,
): Promise<'not_found' | 'expired' | 'active'> {
  const { data, error } = await supabase.rpc('check_shared_link_status', {
    p_conversation_id: conversationId,
  })
  if (error) return 'not_found'
  return data.status
}

export function getOrCreateFingerprint(conversationId: string): string {
  const key = `access_fp_${conversationId}`
  let fp = localStorage.getItem(key)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(key, fp)
  }
  return fp
}

export async function submitAccessRequest(
  conversationId: string,
  fingerprint: string,
): Promise<{ success: boolean; alreadyRequested?: boolean; notFound?: boolean }> {
  const { data, error } = await supabase.rpc('submit_access_request', {
    p_conversation_id: conversationId,
    p_fingerprint: fingerprint,
  })
  if (error) throw error
  if (data.error === 'not_found') {
    return { success: false, notFound: true }
  }
  if (data.error === 'already_requested') {
    return { success: false, alreadyRequested: true }
  }
  return { success: data.success }
}

export async function fetchPendingRequests(): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from('access_requests')
    .select('id, conversation_id, status, created_at, conversations(title)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    conversation_title:
      (row.conversations as { title: string } | null)?.title ?? 'Untitled',
    status: row.status as 'pending',
    created_at: row.created_at as string,
  }))
}

export async function approveAccessRequest(
  conversationId: string,
  durationHours?: number,
): Promise<void> {
  const shared_expires_at = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null

  const { error: convError } = await supabase
    .from('conversations')
    .update({ is_shared: true, shared_expires_at })
    .eq('id', conversationId)
  if (convError) throw convError

  // Mark all pending requests for this conversation as approved
  const { error: reqError } = await supabase
    .from('access_requests')
    .update({ status: 'approved', resolved_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
  if (reqError) throw reqError
}

export async function denyAccessRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('access_requests')
    .update({ status: 'denied', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}
