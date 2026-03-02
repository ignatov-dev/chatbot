import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react'
import { updateUserRole } from '../../services/adminUsers'
import { updatePermissions, type RolePermission, type AccessLevel } from '../../services/permissions'
import { ingestDocument, deleteDocument, formatDocument, splitIntoChunks, type PreviewChunk } from '../../services/documents'
import { createSuggestion, updateSuggestion, deleteSuggestion } from '../../services/suggestions'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../ConfirmDialog'
import styles from './AdminConfig.module.css'

const SHARE_OPTIONS: { label: string; hours: number }[] = [
  { label: '1h', hours: 1 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: 'No limit', hours: 0 },
]

interface AdminConfigProps {
  onBack: () => void
}

type ConfigTab = 'users' | 'permissions' | 'documents' | 'suggestions'

export default function AdminConfig({ onBack }: AdminConfigProps) {
  const { user: currentUser, adminUsers: users, adminUsersLoading: loading, adminUsersError: error, setAdminUsers, userRole, permissionsAccess, documentsAccess, suggestionsAccess, allPermissions, refetchPermissions, allSources, refetchSources, allSuggestions, refetchSuggestions, refetchMySuggestions } = useAuth()
  const [activeTab, setActiveTab] = useState<ConfigTab>('users')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [savingRoles, setSavingRoles] = useState<Set<string>>(new Set())
  const [localPerms, setLocalPerms] = useState<RolePermission[] | null>(null)
  const isManager = userRole === 'manager'

  // Users tab state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users
    const q = userSearchQuery.toLowerCase()
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, userSearchQuery])

  // Documents tab state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadContent, setUploadContent] = useState<string | null>(null)
  const [uploadPreviewChunks, setUploadPreviewChunks] = useState<PreviewChunk[] | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [isFormatting, setIsFormatting] = useState(false)
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())
  const [editingChunk, setEditingChunk] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deleteSource, setDeleteSource] = useState<string | null>(null)
  const [deletingSource, setDeletingSource] = useState<string | null>(null)

  // Suggestions tab state
  const [newSuggestionText, setNewSuggestionText] = useState('')
  const [isAddingSuggestion, setIsAddingSuggestion] = useState(false)
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [editingSuggestionText, setEditingSuggestionText] = useState('')
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null)
  const [confirmDeleteSuggestion, setConfirmDeleteSuggestion] = useState<string | null>(null)

  // Use local edits if present, otherwise use context
  const permissions = localPerms ?? allPermissions

  const handleSetRole = useCallback(async (userId: string, newRole: 'admin' | 'manager' | null) => {
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

  const handleToggleSource = useCallback((role: string, source: string, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const sources = enabled
          ? [...p.allowed_sources, source]
          : p.allowed_sources.filter((s) => s !== source)
        return { ...p, allowed_sources: sources }
      })
    })
  }, [allPermissions])

  const handleToggleShareHours = useCallback((role: string, hours: number, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const list = enabled
          ? [...p.allowed_share_hours, hours]
          : p.allowed_share_hours.filter((h) => h !== hours)
        return { ...p, allowed_share_hours: list }
      })
    })
  }, [allPermissions])

  const handleSetAccess = useCallback((role: string, field: 'permissions_access' | 'documents_access' | 'suggestions_access', value: AccessLevel) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => p.role === role ? { ...p, [field]: value } : p)
    })
  }, [allPermissions])

  const handleSavePermissions = useCallback(async (role: string) => {
    const perm = permissions.find((p) => p.role === role)
    if (!perm) return
    setSavingRoles((prev) => new Set(prev).add(role))
    try {
      await updatePermissions(role, perm.allowed_sources, perm.allowed_share_hours, perm.permissions_access ?? 'none', perm.documents_access ?? 'none', perm.suggestions_access ?? 'none', perm.allowed_suggestions ?? [])
      await refetchPermissions()
      setLocalPerms(null)
    } catch {
      // revert on failure
    } finally {
      setSavingRoles((prev) => {
        const next = new Set(prev)
        next.delete(role)
        return next
      })
    }
  }, [permissions, refetchPermissions])

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.name.endsWith('.txt')) return
    setIngestError(null)
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setUploadContent(text)
      setUploadPreviewChunks(splitIntoChunks(text))
      setExpandedChunks(new Set())
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [])

  const handleCancelUpload = useCallback(() => {
    setUploadFile(null)
    setUploadContent(null)
    setUploadPreviewChunks(null)
    setIngestError(null)
  }, [])

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadFile || !uploadContent) return
    setIsIngesting(true)
    setIngestError(null)
    try {
      const alreadyExists = allSources.includes(uploadFile.name)
      await ingestDocument(uploadFile.name, uploadContent, alreadyExists)
      setUploadFile(null)
      setUploadContent(null)
      setUploadPreviewChunks(null)
      await refetchSources()
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsIngesting(false)
    }
  }, [uploadFile, uploadContent, allSources, refetchSources])

  const handleDeleteChunk = useCallback((index: number) => {
    setUploadPreviewChunks((prev) => prev ? prev.filter((_, i) => i !== index) : prev)
    setExpandedChunks((prev) => {
      const next = new Set<number>()
      prev.forEach((idx) => { if (idx < index) next.add(idx); else if (idx > index) next.add(idx - 1) })
      return next
    })
  }, [])

  const handleToggleChunk = useCallback((index: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }, [])

  const handleStartEdit = useCallback((index: number, content: string) => {
    setEditingChunk(index)
    setEditingContent(content)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingChunk === null) return
    const idx = editingChunk
    setUploadPreviewChunks((prev) => prev ? prev.map((c, i) => i === idx ? { ...c, content: editingContent } : c) : prev)
    setEditingChunk(null)
    setEditingContent('')
  }, [editingChunk, editingContent])

  const handleCancelEdit = useCallback(() => {
    setEditingChunk(null)
    setEditingContent('')
  }, [])

  const handleFormatWithAI = useCallback(async () => {
    if (!uploadContent) return
    setIsFormatting(true)
    setIngestError(null)
    try {
      const formatted = await formatDocument(uploadContent)
      setUploadContent(formatted)
      setUploadPreviewChunks(splitIntoChunks(formatted))
      setExpandedChunks(new Set())
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Formatting failed')
    } finally {
      setIsFormatting(false)
    }
  }, [uploadContent])

  const handleDeleteDocument = useCallback(async (source: string) => {
    setDeletingSource(source)
    try {
      await deleteDocument(source)
      await refetchSources()
    } catch {
      // deletion failed silently
    } finally {
      setDeletingSource(null)
      setDeleteSource(null)
    }
  }, [refetchSources])

  const handleAddSuggestion = useCallback(async () => {
    if (!newSuggestionText.trim()) return
    setIsAddingSuggestion(true)
    try {
      await createSuggestion(newSuggestionText.trim())
      setNewSuggestionText('')
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // add failed
    } finally {
      setIsAddingSuggestion(false)
    }
  }, [newSuggestionText, refetchSuggestions, refetchMySuggestions])

  const handleSaveEditSuggestion = useCallback(async () => {
    if (!editingSuggestionId || !editingSuggestionText.trim()) return
    try {
      await updateSuggestion(editingSuggestionId, editingSuggestionText.trim())
      setEditingSuggestionId(null)
      setEditingSuggestionText('')
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // edit failed
    }
  }, [editingSuggestionId, editingSuggestionText, refetchSuggestions, refetchMySuggestions])

  const handleDeleteSuggestion = useCallback(async (id: string) => {
    setDeletingSuggestionId(id)
    try {
      await deleteSuggestion(id)
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // deletion failed
    } finally {
      setDeletingSuggestionId(null)
      setConfirmDeleteSuggestion(null)
    }
  }, [refetchSuggestions, refetchMySuggestions])

  const handleToggleSuggestion = useCallback((role: string, suggestionId: string, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const suggestions = enabled
          ? [...(p.allowed_suggestions ?? []), suggestionId]
          : (p.allowed_suggestions ?? []).filter((id) => id !== suggestionId)
        return { ...p, allowed_suggestions: suggestions }
      })
    })
  }, [allPermissions])

  const hasChanges = (role: string) => {
    const local = permissions.find((p) => p.role === role)
    const original = allPermissions.find((p) => p.role === role)
    if (!local || !original) return false
    return (
      JSON.stringify(local.allowed_sources.slice().sort()) !== JSON.stringify(original.allowed_sources.slice().sort()) ||
      JSON.stringify(local.allowed_share_hours.slice().sort()) !== JSON.stringify(original.allowed_share_hours.slice().sort()) ||
      local.permissions_access !== original.permissions_access ||
      local.documents_access !== original.documents_access ||
      local.suggestions_access !== original.suggestions_access ||
      JSON.stringify((local.allowed_suggestions ?? []).slice().sort()) !== JSON.stringify((original.allowed_suggestions ?? []).slice().sort())
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn} aria-label="Back to chat">
          <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </button>
        <div className={styles.configTabs}>
          <button
            className={`${styles.configTab} ${activeTab === 'users' ? styles.configTabActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Roles
          </button>
          {permissionsAccess !== 'none' && permissions.length > 0 && (
            <button
              className={`${styles.configTab} ${activeTab === 'permissions' ? styles.configTabActive : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              Permissions
            </button>
          )}
          {documentsAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'documents' ? styles.configTabActive : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </button>
          )}
          {suggestionsAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'suggestions' ? styles.configTabActive : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              Suggestions
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'users' && (
          <>
            {loading && users.length === 0 && (
              <div className={styles.loadingState}>Loading users...</div>
            )}

            {error && users.length === 0 && (
              <div className={styles.errorState}>{error}</div>
            )}

            {!loading && users.length === 0 && (
              <div className={styles.emptyState}>No other users found</div>
            )}

            {users.length > 0 && (
              <div className={styles.userSearchWrapper}>
                <svg className={styles.userSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  className={styles.userSearchInput}
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <button className={styles.userSearchClear} onClick={() => setUserSearchQuery('')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}

            <div style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
              {(() => {
                const selfUser = filteredUsers.find((u) => u.id === currentUser?.id)
                const otherUsers = filteredUsers.filter((u) => u.id !== currentUser?.id)

                const renderRow = (user: typeof users[0], isSelf: boolean) => (
                  <div key={user.id} className={styles.userRow}>
                    <div className={styles.userInfo}>
                      <div className={styles.userEmail}>
                        {user.email}
                        {isSelf && <span className={styles.youTag}>you</span>}
                      </div>
                    </div>
                    <div className={styles.accessSwitcher}>
                      <button
                        className={`${styles.accessOption} ${!user.user_role ? styles.accessOptionActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || !user.user_role || (isManager && user.user_role === 'admin')}
                        onClick={() => handleSetRole(user.id, null)}
                      >
                        User
                      </button>
                      <button
                        className={`${styles.accessOption} ${user.user_role === 'manager' ? styles.accessOptionActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || user.user_role === 'manager' || (isManager && user.user_role === 'admin')}
                        onClick={() => handleSetRole(user.id, 'manager')}
                      >
                        Manager
                      </button>
                      <button
                        className={`${styles.accessOption} ${user.user_role === 'admin' ? styles.accessOptionActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || user.user_role === 'admin' || isManager}
                        onClick={() => handleSetRole(user.id, 'admin')}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )

                return (
                  <>
                    {selfUser && renderRow(selfUser, true)}
                    {otherUsers.map((user) => renderRow(user, false))}
                  </>
                )
              })()}
            </div>
          </>
        )}

        {activeTab === 'permissions' && (
          <div className={styles.permColumns}>
            {permissions.map((perm) => {
              const isSelfRole = perm.role === (userRole ?? 'user') && userRole !== 'admin'
              const disabled = isSelfRole || permissionsAccess !== 'edit' || (isManager && perm.role === 'admin')
              const saving = savingRoles.has(perm.role)
              const changed = hasChanges(perm.role)

              const ACCESS_OPTIONS: { value: AccessLevel; label: string }[] = [
                { value: 'none', label: 'None' },
                { value: 'view', label: 'View' },
                { value: 'edit', label: 'Edit' },
              ]

              const renderAccessSwitcher = (field: 'permissions_access' | 'documents_access' | 'suggestions_access') => {
                const isProtected = perm.role === 'admin' && field === 'permissions_access'
                return (
                  <div className={styles.accessSwitcher}>
                    {ACCESS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`${styles.accessOption} ${perm[field] === opt.value ? styles.accessOptionActive : ''}`}
                        disabled={disabled || (isProtected && opt.value !== 'edit')}
                        onClick={() => handleSetAccess(perm.role, field, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )
              }

              return (
                <div key={perm.role} className={styles.permColumn}>
                  <span className={styles.permColName}>
                    {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                  </span>
                  <button
                    className={styles.saveBtn}
                    onClick={() => handleSavePermissions(perm.role)}
                    disabled={saving || !changed}
                    style={changed ? undefined : { visibility: 'hidden' }}
                  >
                    Save
                  </button>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Tab access</span>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>PERMISSIONS</span>
                      {renderAccessSwitcher('permissions_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>DOCUMENTS</span>
                      {renderAccessSwitcher('documents_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>SUGGESTIONS</span>
                      {renderAccessSwitcher('suggestions_access')}
                    </div>
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Document access</span>
                    {allSources.map((source) => {
                      const active = perm.allowed_sources.includes(source)
                      return (
                        <div key={source} className={styles.toggleRow}>
                          <span className={styles.toggleLabel}>{source}</span>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={disabled}
                              onChange={() => handleToggleSource(perm.role, source, !active)}
                            />
                            <span className={styles.toggleTrack} />
                            <span className={styles.toggleThumb} />
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Share options</span>
                    {SHARE_OPTIONS.map((opt) => {
                      const active = perm.allowed_share_hours.includes(opt.hours)
                      return (
                        <div key={opt.label} className={styles.toggleRow}>
                          <span className={styles.toggleLabel}>{opt.label}</span>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={disabled}
                              onChange={() => handleToggleShareHours(perm.role, opt.hours, !active)}
                            />
                            <span className={styles.toggleTrack} />
                            <span className={styles.toggleThumb} />
                          </label>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'documents' && (
          <>
            {documentsAccess === 'edit' && (
              <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className={styles.fileInput}
                  onChange={handleFileSelect}
                />
                <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <span>Click to upload a .txt document</span>
              </div>
            )}

            {ingestError && (
              <div className={styles.errorState} style={{ padding: '12px 0' }}>{ingestError}</div>
            )}

            {allSources.length === 0 && (
              <div className={styles.emptyState}>No documents ingested yet</div>
            )}

            {allSources.map((source) => (
              <div key={source} className={styles.sourceRow}>
                <span className={styles.sourceName}>{source}</span>
                {documentsAccess === 'edit' && (
                  <button
                    className={styles.sourceDeleteBtn}
                    disabled={deletingSource === source}
                    onClick={() => setDeleteSource(source)}
                    aria-label={`Delete ${source}`}
                  >
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === 'suggestions' && (
          <>
            {suggestionsAccess === 'edit' && (
              <div className={styles.suggestionAddRow}>
                <input
                  type="text"
                  className={styles.suggestionInput}
                  placeholder="Type a suggestion question..."
                  value={newSuggestionText}
                  onChange={(e) => setNewSuggestionText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSuggestion() }}
                  disabled={isAddingSuggestion}
                />
                <button
                  className={styles.publishBtn}
                  onClick={handleAddSuggestion}
                  disabled={isAddingSuggestion || !newSuggestionText.trim()}
                >
                  {isAddingSuggestion ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}

            {allSuggestions.length === 0 && (
              <div className={styles.emptyState}>No suggestions yet</div>
            )}

            {suggestionsAccess === 'edit' && allSuggestions.map((s) => (
              <div key={s.id} className={styles.sourceRow}>
                {editingSuggestionId === s.id ? (
                  <div className={styles.suggestionEditRow}>
                    <input
                      type="text"
                      className={styles.suggestionInput}
                      value={editingSuggestionText}
                      onChange={(e) => setEditingSuggestionText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditSuggestion() }}
                      autoFocus
                    />
                    <button className={styles.chunkEditSave} onClick={handleSaveEditSuggestion}>Save</button>
                    <button className={styles.chunkEditCancel} onClick={() => { setEditingSuggestionId(null); setEditingSuggestionText('') }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className={styles.sourceName}>{s.text}</span>
                    {suggestionsAccess === 'edit' && (
                      <>
                        <button
                          className={styles.chunkEditBtn}
                          onClick={() => { setEditingSuggestionId(s.id); setEditingSuggestionText(s.text) }}
                          aria-label="Edit suggestion"
                        >
                          <svg viewBox="0 0 20 20" width={14} height={14} fill="currentColor">
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                          </svg>
                        </button>
                        <button
                          className={styles.sourceDeleteBtn}
                          disabled={deletingSuggestionId === s.id}
                          onClick={() => setConfirmDeleteSuggestion(s.id)}
                          aria-label="Delete suggestion"
                        >
                          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}

            {allSuggestions.length > 0 && permissions.length > 0 && (
              <div className={styles.permColumns}>
                {permissions.map((perm) => {
                  const disabled = permissionsAccess !== 'edit' || (isManager && perm.role === 'admin')
                  const saving = savingRoles.has(perm.role)
                  const changed = hasChanges(perm.role)

                  return (
                    <div key={perm.role} className={styles.permColumn}>
                      <span className={styles.permColName}>
                        {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                      </span>
                      <button
                        className={styles.saveBtn}
                        onClick={() => handleSavePermissions(perm.role)}
                        disabled={saving || !changed}
                        style={changed ? undefined : { visibility: 'hidden' }}
                      >
                        Save
                      </button>

                      {allSuggestions.map((s) => {
                        const active = (perm.allowed_suggestions ?? []).includes(s.id)
                        return (
                          <div key={s.id} className={styles.toggleRow}>
                            <span className={styles.toggleLabel}>{s.text}</span>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={active}
                                disabled={disabled}
                                onChange={() => handleToggleSuggestion(perm.role, s.id, !active)}
                              />
                              <span className={styles.toggleTrack} />
                              <span className={styles.toggleThumb} />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload preview popup */}
      {uploadPreviewChunks && uploadFile && (
        <div className={styles.previewOverlay} onClick={(e) => { if (e.target === e.currentTarget && !isIngesting) handleCancelUpload() }}>
          <div className={styles.previewDialog}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>{uploadFile.name}</div>
              <div className={styles.previewMeta}>{uploadPreviewChunks.length} chunk{uploadPreviewChunks.length !== 1 ? 's' : ''}</div>
              <button
                className={styles.formatBtn}
                onClick={handleFormatWithAI}
                disabled={isFormatting || isIngesting}
              >
                {isFormatting ? 'Formatting...' : (<>Format <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} style={{ verticalAlign: 'middle', marginLeft: 2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg></>)}
              </button>
            </div>
            <div className={styles.previewChunkList}>
              {uploadPreviewChunks.map((chunk, i) => (
                <div key={i} className={styles.previewChunk}>
                  <div className={styles.chunkHeader}>
                    <span className={styles.chunkTitle}>{chunk.title}</span>
                    <button
                      className={styles.chunkEditBtn}
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(i, chunk.content) }}
                      disabled={isIngesting}
                      aria-label={`Edit chunk`}
                    >
                      <svg viewBox="0 0 20 20" width={14} height={14} fill="currentColor">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button
                      className={styles.chunkDeleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDeleteChunk(i) }}
                      disabled={isIngesting}
                      aria-label={`Delete chunk`}
                    >
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {editingChunk === i ? (
                    <div className={styles.chunkEditArea}>
                      <textarea
                        className={styles.chunkTextarea}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                      />
                      <div className={styles.chunkEditActions}>
                        <button className={styles.chunkEditCancel} onClick={handleCancelEdit}>Cancel</button>
                        <button className={styles.chunkEditSave} onClick={handleSaveEdit}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.chunkText} onClick={() => handleToggleChunk(i)}>
                      {expandedChunks.has(i) ? chunk.content : chunk.content.length > 200 ? chunk.content.slice(0, 200) + '...' : chunk.content}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {ingestError && (
              <div className={styles.errorState} style={{ padding: '8px 0 0', textAlign: 'left' }}>{ingestError}</div>
            )}
            <div className={styles.previewActions}>
              <button className={styles.cancelBtn} onClick={handleCancelUpload} disabled={isIngesting}>
                Cancel
              </button>
              <button className={styles.publishBtn} onClick={handleConfirmUpload} disabled={isIngesting}>
                {isIngesting ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete document confirmation */}
      {deleteSource && (
        <ConfirmDialog
          title="Delete document"
          message={`All chunks for "${deleteSource}" will be permanently deleted. This cannot be undone.`}
          onConfirm={() => handleDeleteDocument(deleteSource)}
          onCancel={() => setDeleteSource(null)}
        />
      )}

      {/* Delete suggestion confirmation */}
      {confirmDeleteSuggestion && (
        <ConfirmDialog
          title="Delete suggestion"
          message="This suggestion will be permanently deleted from all roles. This cannot be undone."
          onConfirm={() => handleDeleteSuggestion(confirmDeleteSuggestion)}
          onCancel={() => setConfirmDeleteSuggestion(null)}
        />
      )}
    </div>
  )
}
