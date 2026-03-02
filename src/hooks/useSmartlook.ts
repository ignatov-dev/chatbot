import { useEffect, useRef } from 'react'
import Smartlook from 'smartlook-client'

const SMARTLOOK_KEY = import.meta.env.VITE_SMARTLOOK_PROJECT_KEY as string | undefined

export function useSmartlook(user: { id: string; email?: string } | null) {
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!SMARTLOOK_KEY || !user) return
    if (identifiedRef.current === user.id) return

    if (!Smartlook.initialized()) {
      Smartlook.init(SMARTLOOK_KEY)
    }

    Smartlook.identify(user.id, {
      email: user.email ?? '',
    })
    identifiedRef.current = user.id
  }, [user])
}
