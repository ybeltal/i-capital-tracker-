/**
 * THE i-CAPITAL AFRICA INSTITUTE — ROLE-TARGETED LIVE NOTIFICATION BELL
 * Listens to public.notifications via Supabase Realtime.
 * Filters strictly by active role (target_roles) or recipient email (target_user_email)
 * with independent per-user read tracking (read_by_emails).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabase'

function timeAgo(isoString) {
  if (!isoString) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000))
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function getSeverityStyle(severity) {
  if (severity === 'success') {
    return { border: '#10b981', badgeBg: '#dcfce7', badgeText: '#166534', icon: '✅' }
  }
  if (severity === 'warning') {
    return { border: '#dc2626', badgeBg: '#fee2e2', badgeText: '#991b1b', icon: '⚠️' }
  }
  if (severity === 'action') {
    return { border: '#ea580c', badgeBg: '#ffedd5', badgeText: '#c2410c', icon: '🛡️' }
  }
  return { border: '#0284c7', badgeBg: '#e0f2fe', badgeText: '#0369a1', icon: 'ℹ️' }
}

export default function NotificationBell({
  userProfile,
  effectiveRole,
  onNavigateTab,
  onNavigateToProject,
  onUnreadCountChange,
}) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [filterMode, setFilterMode] = useState('unread') // 'unread' | 'all'
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)

  const activeRole = (effectiveRole || userProfile?.role || 'read_only').toLowerCase()
  const userEmail = (userProfile?.email || '').toLowerCase().trim()

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('crm-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Close dropdown when clicking outside the bell menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  async function fetchNotifications() {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  // Filter strictly to notifications meant for THIS user's active role or personal email
  const myNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const roles = Array.isArray(n.target_roles)
        ? n.target_roles.map((r) => String(r).toLowerCase())
        : []
      const targetEmail = (n.target_user_email || '').toLowerCase().trim()

      const matchesRole = roles.includes(activeRole)
      const matchesEmail = Boolean(targetEmail && userEmail && targetEmail === userEmail)
      return matchesRole || matchesEmail
    })
  }, [notifications, activeRole, userEmail])

  const isReadByMe = (n) => {
    if (!userEmail) return false
    const readers = Array.isArray(n.read_by_emails)
      ? n.read_by_emails.map((e) => String(e).toLowerCase())
      : []
    return readers.includes(userEmail)
  }

  const unreadList = useMemo(
    () => myNotifications.filter((n) => !isReadByMe(n)),
    [myNotifications, userEmail]
  )

  const unreadSmealCount = useMemo(
    () => unreadList.filter((n) => n.category === 'smeal_review').length,
    [unreadList]
  )

  // Report live counts up to App.jsx for the Project Delivery tab badge
  useEffect(() => {
    onUnreadCountChange?.({
      total: unreadList.length,
      smealReview: unreadSmealCount,
    })
  }, [unreadList.length, unreadSmealCount])

  async function markAsRead(notification) {
    if (!userEmail || isReadByMe(notification)) return
    const currentReaders = Array.isArray(notification.read_by_emails)
      ? notification.read_by_emails
      : []
    const nextReaders = Array.from(new Set([...currentReaders, userEmail]))

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read_by_emails: nextReaders } : item
      )
    )

    await supabase
      .from('notifications')
      .update({ read_by_emails: nextReaders })
      .eq('id', notification.id)
  }

  async function markAllAsRead() {
    if (!userEmail || unreadList.length === 0) return

    const updates = unreadList.map((n) => {
      const currentReaders = Array.isArray(n.read_by_emails) ? n.read_by_emails : []
      return {
        id: n.id,
        nextReaders: Array.from(new Set([...currentReaders, userEmail])),
      }
    })

    const updateMap = new Map(updates.map((u) => [u.id, u.nextReaders]))
    setNotifications((prev) =>
      prev.map((item) =>
        updateMap.has(item.id)
          ? { ...item, read_by_emails: updateMap.get(item.id) }
          : item
      )
    )

    await Promise.all(
      updates.map((u) =>
        supabase
          .from('notifications')
          .update({ read_by_emails: u.nextReaders })
          .eq('id', u.id)
      )
    )
  }

  async function handleNotificationAction(n) {
    await markAsRead(n)
    setIsOpen(false)
    if (n.reference_tab === 'projects' && onNavigateToProject) {
      onNavigateToProject(n.reference_id || null)
    } else if (n.reference_tab && onNavigateTab) {
      onNavigateTab(n.reference_tab)
    }
  }

  const visibleItems = filterMode === 'unread' ? unreadList : myNotifications

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* HEADER BELL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title={
          unreadList.length > 0
            ? `${unreadList.length} unread governance alert(s)`
            : 'No unread alerts'
        }
        style={{
          position: 'relative',
          padding: '6px 10px',
          background: unreadList.length > 0 ? 'rgba(234, 88, 12, 0.22)' : '#1e293b',
          border: unreadList.length > 0 ? '1px solid #fb923c' : '1px solid #334155',
          borderRadius: 8,
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        <span>🔔</span>
        {unreadList.length > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 900,
              padding: '1px 6px',
              borderRadius: 999,
              lineHeight: '14px',
              minWidth: 16,
              textAlign: 'center',
            }}
          >
            {unreadList.length > 99 ? '99+' : unreadList.length}
          </span>
        )}
      </button>

      {/* DROPDOWN NOTIFICATION INBOX */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 400,
            maxWidth: '92vw',
            maxHeight: '78vh',
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.32)',
            zIndex: 100001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#0f172a',
          }}
        >
          {/* Inbox Header */}
          <div
            style={{
              background: 'linear-gradient(90deg, #060b18 0%, #0f172a 100%)',
              color: '#ffffff',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>
                🔔 Governance &amp; SMEAL Alerts
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                Role filter: <strong style={{ color: '#38bdf8' }}>{activeRole.toUpperCase()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadList.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: '#e2e8f0',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark All Read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Unread / All Toggle */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px 12px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setFilterMode('unread')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: filterMode === 'unread' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: filterMode === 'unread' ? '#0284c7' : '#ffffff',
                color: filterMode === 'unread' ? '#ffffff' : '#475569',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Unread ({unreadList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: filterMode === 'all' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: filterMode === 'all' ? '#0284c7' : '#ffffff',
                color: filterMode === 'all' ? '#ffffff' : '#475569',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              All History ({myNotifications.length})
            </button>
          </div>

          {/* Notification Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                Loading alerts…
              </div>
            ) : visibleItems.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                  {filterMode === 'unread' ? 'All caught up!' : 'No alerts for your role yet'}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  SMEAL reviews and approval updates appear here in real time.
                </div>
              </div>
            ) : (
              visibleItems.map((n) => {
                const sev = getSeverityStyle(n.severity)
                const unread = !isReadByMe(n)

                return (
                  <div
                    key={n.id}
                    style={{
                      background: unread ? '#fffbeb' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${sev.border}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                        {sev.icon} {n.title}
                      </div>
                      <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.45 }}>
                      {n.message}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleNotificationAction(n)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: n.category === 'smeal_review' ? '#ea580c' : '#0284c7',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {n.category === 'smeal_review'
                            ? 'Open & Approve →'
                            : 'Open Project →'}
                        </button>

                        {n.document_url && (
                          <a
                            href={n.document_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => markAsRead(n)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0369a1',
                              fontSize: 11,
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            📄 Agreement ↗
                          </a>
                        )}
                      </div>

                      {unread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(n)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}