import { useState, useCallback } from 'react'
import { updateUserRole } from '../../services/adminUsers'
import { useAuth } from '../../contexts/AuthContext'
import styles from './AdminConfig.module.css'

interface AdminConfigProps {
  onBack: () => void
}

export default function AdminConfig({ onBack }: AdminConfigProps) {
  const { adminUsers: users, adminUsersLoading: loading, adminUsersError: error, setAdminUsers } = useAuth()
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const handleToggleRole = useCallback(async (userId: string, currentRole: string | null) => {
    const newRole = currentRole === 'admin' ? null : 'admin'
    setUpdatingIds((prev) => new Set(prev).add(userId))

    try {
      const updatedUsers = await updateUserRole(userId, newRole)
      setAdminUsers(updatedUsers)
    } catch {
      // role unchanged on failure
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [setAdminUsers])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn} aria-label="Back to chat">
          <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className={styles.title}>Configuration</h1>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionTitle}>User Management</h2>

        {loading && users.length === 0 && (
          <div className={styles.loadingState}>Loading users...</div>
        )}

        {error && users.length === 0 && (
          <div className={styles.errorState}>{error}</div>
        )}

        {!loading && users.length === 0 && (
          <div className={styles.emptyState}>No other users found</div>
        )}

        <div style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
          {users.map((user) => (
            <div key={user.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
              <div className={styles.roleTabs}>
                <button
                  className={`${styles.roleTab} ${user.user_role !== 'admin' ? styles.roleTabActive : ''}`}
                  disabled={updatingIds.has(user.id) || user.user_role !== 'admin'}
                  onClick={() => handleToggleRole(user.id, user.user_role)}
                >
                  User
                </button>
                <button
                  className={`${styles.roleTab} ${user.user_role === 'admin' ? styles.roleTabActive : ''}`}
                  disabled={updatingIds.has(user.id) || user.user_role === 'admin'}
                  onClick={() => handleToggleRole(user.id, user.user_role)}
                >
                  Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
