import { supabase } from '../lib/supabase'

export interface AdminUser {
  id: string
  email: string
  user_role: string | null
  created_at: string
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('list_users_for_admin')

  if (error) throw new Error(error.message)

  return (data ?? []) as AdminUser[]
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | null,
): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('update_user_role', {
    target_user_id: userId,
    new_role: role,
  })

  if (error) throw new Error(error.message)

  return (data ?? []) as AdminUser[]
}
