import { supabase } from '../lib/supabase'

export async function submitFeedback(rating: number, message?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feedback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...(rating > 0 ? { rating } : {}),
        ...(message?.trim() ? { message } : {}),
      }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to submit feedback')
  }
}
