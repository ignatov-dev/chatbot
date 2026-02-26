import { supabase } from '../lib/supabase'

export interface ConversationSummary {
  id: string
  title: string
  source: string
  updated_at: string
}

export interface DbMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function fetchConversations(sources?: string[]): Promise<ConversationSummary[]> {
  let query = supabase
    .from('conversations')
    .select('id, title, source, updated_at')
    .order('updated_at', { ascending: false })
  if (sources?.length) query = query.in('source', sources)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createConversation(source: string, title?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('conversations')
    .insert({ source, title: title ?? 'New conversation', user_id: user!.id })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function fetchMessages(conversationId: string): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
  if (error) throw error
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id)
  if (error) throw error
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
  if (error) throw error
}
