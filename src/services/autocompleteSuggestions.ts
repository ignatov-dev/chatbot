import { supabase } from '../lib/supabase'

export interface AutocompleteSuggestion {
  id: string
  question: string
  keywords: string[]
  sort_order: number
  created_at: string
}

export async function fetchAllAutocompleteSuggestions(): Promise<AutocompleteSuggestion[]> {
  const { data, error } = await supabase
    .from('autocomplete_suggestions')
    .select('id, question, keywords, sort_order, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchAutocompleteForRole(): Promise<AutocompleteSuggestion[]> {
  const { data, error } = await supabase.rpc('get_autocomplete_for_role')
  if (error) throw error
  return data ?? []
}

export async function createAutocompleteSuggestion(question: string, keywords: string[] = [], sortOrder?: number): Promise<AutocompleteSuggestion> {
  const { data, error } = await supabase
    .from('autocomplete_suggestions')
    .insert({ question, keywords, sort_order: sortOrder ?? 0 })
    .select('id, question, keywords, sort_order, created_at')
    .single()
  if (error) throw error
  return data
}

export async function updateAutocompleteSuggestion(id: string, question: string, keywords: string[] = []): Promise<void> {
  const { error } = await supabase
    .from('autocomplete_suggestions')
    .update({ question, keywords })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAutocompleteSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('autocomplete_suggestions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
