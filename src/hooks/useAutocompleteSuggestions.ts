import { useAuth } from '../contexts/AuthContext'
import type { AutocompleteSuggestion } from '../services/autocompleteSuggestions'

export function useAutocompleteSuggestions(): AutocompleteSuggestion[] {
  const { autocompleteSuggestions } = useAuth()
  return autocompleteSuggestions
}
