'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'left-sidebar-collapsed'

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function getServerSnapshot(): boolean {
  return false
}

export function useSidebar() {
  const isCollapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const setIsCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value))
    emitChange()
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed, setIsCollapsed])

  return {
    isCollapsed,
    setIsCollapsed,
    toggleSidebar,
  }
}
