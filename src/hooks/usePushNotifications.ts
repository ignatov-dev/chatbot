import { useState, useEffect, useCallback } from 'react'
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/pushSubscription'

export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sup = isPushSupported()
    setSupported(sup)
    if (sup) {
      isPushSubscribed().then((val) => {
        setSubscribed(val)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const toggle = useCallback(async () => {
    setLoading(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        const success = await subscribeToPush()
        setSubscribed(success)
      }
    } finally {
      setLoading(false)
    }
  }, [subscribed])

  return { supported, subscribed, loading, toggle }
}
