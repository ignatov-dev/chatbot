import { supabase } from '../lib/supabase'

export interface Suggestion {
  id: string
  text: string
  sort_order: number
  created_at: string
}

export async function fetchAllSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, text, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchSuggestionsForRole(): Promise<Suggestion[]> {
  const { data, error } = await supabase.rpc('get_suggestions_for_role')
  if (error) throw error
  return data ?? []
}

export async function createSuggestion(text: string, sortOrder?: number): Promise<Suggestion> {
  const { data, error } = await supabase
    .from('suggestions')
    .insert({ text, sort_order: sortOrder ?? 0 })
    .select('id, text, sort_order, created_at')
    .single()
  if (error) throw error
  return data
}

export async function updateSuggestion(id: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('suggestions')
    .update({ text })
    .eq('id', id)
  if (error) throw error
}

export async function deleteSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('suggestions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
