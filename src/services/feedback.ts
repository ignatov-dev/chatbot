import { supabase } from '../lib/supabase'

export type FeedbackRating = 'up' | 'down'
export type FeedbackReason = 'wrong_answer' | 'incomplete' | 'confusing' | 'off_topic'

export interface MessageFeedback {
  message_id: string
  rating: FeedbackRating
  reasons: FeedbackReason[] | null
}

export async function upsertFeedback(
  messageId: string,
  rating: FeedbackRating,
  reasons?: FeedbackReason[] | null,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('message_feedback')
    .upsert(
      {
        message_id: messageId,
        user_id: user.id,
        rating,
        reasons: rating === 'down' ? (reasons ?? null) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'message_id,user_id' },
    )
  if (error) throw error
}

export async function deleteFeedback(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('message_feedback')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function fetchFeedbackForMessages(
  messageIds: string[],
): Promise<Record<string, MessageFeedback>> {
  if (messageIds.length === 0) return {}
  const { data, error } = await supabase
    .from('message_feedback')
    .select('message_id, rating, reasons')
    .in('message_id', messageIds)
  if (error) throw error
  const map: Record<string, MessageFeedback> = {}
  for (const row of data ?? []) {
    map[row.message_id] = { message_id: row.message_id, rating: row.rating, reasons: row.reasons }
  }
  return map
}

export interface FeedbackAnalytics {
  total: number
  thumbs_up: number
  thumbs_down: number
  reasons: Record<string, number>
  recent_negative: Array<{
    message_id: string
    content: string
    reasons: string[] | null
    created_at: string
  }>
}

export async function fetchFeedbackAnalytics(
  dateFrom?: string,
  dateTo?: string,
): Promise<FeedbackAnalytics> {
  const { data, error } = await supabase.rpc('get_feedback_analytics', {
    date_from: dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    date_to: dateTo ?? new Date().toISOString(),
  })
  if (error) throw error
  return data as FeedbackAnalytics
}
