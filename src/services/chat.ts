import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export interface ChatResponse {
  answer: string
  options?: string[]
}

export async function askClaude(
  question: string,
  sources?: string[],
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ChatResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ question, sources, history }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }

  const data = (await res.json()) as ChatResponse
  return data
}
