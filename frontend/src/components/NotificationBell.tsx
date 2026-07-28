import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/apiClient'
import type { NotificationRecord, PaginatedResponse } from '../types'
import { BellIcon } from './icons'

const POLL_INTERVAL_MS = 30000

function timeAgo(isoDate: string) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const loadUnreadCount = useCallback(() => {
    apiClient
      .get<{ unread_count: number }>('/api/notifications/unread-count/')
      .then((response) => setUnreadCount(response.data.unread_count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadUnreadCount])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openDropdown() {
    setIsOpen((prev) => !prev)
    if (!isOpen) {
      setIsLoading(true)
      apiClient
        .get<PaginatedResponse<NotificationRecord>>('/api/notifications/')
        .then((response) => setNotifications(response.data.results))
        .finally(() => setIsLoading(false))
    }
  }

  async function handleSelect(notification: NotificationRecord) {
    if (!notification.is_read) {
      await apiClient.post(`/api/notifications/${notification.id}/mark-read/`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    setIsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  async function handleMarkAllRead() {
    await apiClient.post('/api/notifications/mark-all-read/')
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={openDropdown}
        className="relative rounded-full p-2 text-[#5a6a85] hover:bg-[#f4efe2]"
        title="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-[#f0ece0] px-4 py-3">
            <p className="text-sm font-bold text-[#1c2f4d]">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#1c2f4d] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-[#5a6a85]">Loading…</p>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleSelect(notification)}
                  className={`block w-full border-b border-[#f0ece0] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[#faf6ec] ${
                    notification.is_read ? 'text-[#5a6a85]' : 'font-medium text-[#1c2f4d]'
                  }`}
                >
                  <p>{notification.message}</p>
                  <p className="mt-1 text-xs text-[#93a2bc]">{timeAgo(notification.created_at)}</p>
                </button>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-[#5a6a85]">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
