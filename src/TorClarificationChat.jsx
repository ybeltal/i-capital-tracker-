import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'

const ROLE_COLORS = {
  'BD Officer': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  'Proposal Specialist': { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  'Technical Lead': { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'Management': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
}

export default function TorClarificationChat({
  opportunityId,
  tenderCode = 'TENDER',
  clientName = 'Client Target',
  currentUserEmail = 'user@icapital.et',
  currentUserName = 'Team Member',
  isOpen,
  onClose,
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [clauseRef, setClauseRef] = useState('')
  const [selectedRole, setSelectedRole] = useState('Proposal Specialist')
  const [sending, setSending] = useState(false)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    if (!opportunityId || !isOpen) return

    fetchMessages()

    // 1. Subscribe to Supabase Realtime broadcast for this specific tender
    const channel = supabase
      .channel(`tor-discussion-${opportunityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tor_discussions',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
          scrollToBottom()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tor_discussions',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [opportunityId, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tor_discussions')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const payload = {
      opportunity_id: opportunityId,
      sender_email: currentUserEmail,
      sender_name: currentUserName,
      sender_role: selectedRole,
      message: newMessage.trim(),
      clause_reference: clauseRef.trim() || null,
      is_resolved: false,
    }

    const { error } = await supabase.from('tor_discussions').insert([payload])
    if (error) {
      console.error('Failed to post message:', error.message)
    } else {
      setNewMessage('')
      setClauseRef('')
    }
    setSending(false)
  }

  async function toggleResolved(id, currentStatus) {
    await supabase
      .from('tor_discussions')
      .update({ is_resolved: !currentStatus })
      .eq('id', id)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
            padding: '16px 20px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                Live TOR Clarifications
              </h3>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  background: '#10b981',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 10,
                }}
              >
                REALTIME
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {tenderCode} • <span style={{ color: '#e2e8f0' }}>{clientName}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ✕
          </button>
        </div>

        {/* Sender Role Switcher */}
        <div
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
          }}
        >
          <span style={{ color: '#64748b', fontWeight: 700 }}>Chatting as:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 11,
              fontWeight: 700,
              background: '#fff',
              color: '#0f172a',
            }}
          >
            <option value="BD Officer">BD Officer (Source Lead)</option>
            <option value="Proposal Specialist">Proposal Specialist (Drafter)</option>
            <option value="Technical Lead">Technical Lead (SME)</option>
            <option value="Management">Management</option>
          </select>
        </div>

        {/* Messages Feed */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#f8fafc',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 40 }}>
              Connecting to secure tender thread…
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#64748b',
                fontSize: 12,
                marginTop: 60,
                padding: '0 20px',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <strong>No clarifications requested yet.</strong>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Proposal writers can ask questions about ambiguous TOR clauses, scoring criteria, or submission format to the BD officer directly here.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const roleTheme = ROLE_COLORS[msg.sender_role] || ROLE_COLORS['BD Officer']
              const isResolved = msg.is_resolved

              return (
                <div
                  key={msg.id}
                  style={{
                    background: '#ffffff',
                    border: isResolved ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                        {msg.sender_name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: roleTheme.bg,
                          color: roleTheme.text,
                          padding: '1px 6px',
                          borderRadius: 4,
                          border: `1px solid ${roleTheme.border}`,
                        }}
                      >
                        {msg.sender_role}
                      </span>
                    </div>

                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.clause_reference && (
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#fef2f2',
                        color: '#b91c1c',
                        padding: '1px 6px',
                        borderRadius: 4,
                        border: '1px solid #fee2e2',
                      }}
                    >
                      Ref: {msg.clause_reference}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.message}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 6,
                      marginTop: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleResolved(msg.id, isResolved)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: isResolved ? '#15803d' : '#94a3b8',
                      }}
                    >
                      {isResolved ? '✓ Resolved' : '○ Mark as Clarified'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: 14,
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="Clause reference (optional, e.g. Section 4.1 or Bid Security)"
            value={clauseRef}
            onChange={(e) => setClauseRef(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 11,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              rows={2}
              placeholder="Ask BD officer for client clarification..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                fontFamily: 'inherit',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              style={{
                padding: '0 16px',
                borderRadius: 6,
                border: 'none',
                background: sending || !newMessage.trim() ? '#94a3b8' : '#0284c7',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}