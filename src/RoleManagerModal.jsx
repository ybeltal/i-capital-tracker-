import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ROLE_DEFINITIONS } from './AuthRoleContext'

const SBUS = ['All', 'Institute', 'CBS', 'IIP', 'DAS']

export default function RoleManagerModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setUsers(data)
    }
    setLoading(false)
  }

  async function handleRoleChange(user, newRole) {
    if (user.email === 'ybeltalsemagn8899@gmail.com' && newRole !== 'admin') {
      alert('Security Guardrail: The primary Executive Administrator account cannot be demoted.')
      return
    }

    setUpdatingId(user.id)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      )

      setMessage(`Updated ${user.email} role to ${ROLE_DEFINITIONS[newRole].label}.`)
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      alert('Failed to update role: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSbuChange(user, newSbu) {
    setUpdatingId(user.id)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          assigned_sbu: newSbu,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, assigned_sbu: newSbu } : u))
      )
    } catch (err) {
      alert('Failed to update SBU: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleActive(user) {
    if (user.email === 'ybeltalsemagn8899@gmail.com') return

    setUpdatingId(user.id)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: !user.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      )
    } catch (err) {
      alert('Failed to toggle status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                Institutional User Access &amp; Role Management
              </h3>
              <span style={{ fontSize: 9, fontWeight: 800, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
                ADMIN CONSOLE
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Assign one of the six approved governance roles and SBU scopes. Changes take effect instantly in RLS.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {message && (
          <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 24px', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #a7f3d0' }}>
            ✓ {message}
          </div>
        )}

        {/* User Table */}
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                <th style={{ padding: '10px 12px' }}>TEAM MEMBER</th>
                <th style={{ padding: '10px 12px' }}>ASSIGNED ROLE</th>
                <th style={{ padding: '10px 12px' }}>SBU SCOPE</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
                <th style={{ padding: '10px 12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
                    Loading institutional accounts…
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.full_name || 'Team Member'}</div>
                      <div style={{ fontSize: 11, color: '#0284c7' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <select
                        disabled={updatingId === u.id || u.email === 'ybeltalsemagn8899@gmail.com'}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          border: '1px solid #cbd5e1',
                          background: ROLE_DEFINITIONS[u.role]?.badgeBg || '#fff',
                          color: ROLE_DEFINITIONS[u.role]?.badgeText || '#000',
                          cursor: 'pointer',
                        }}
                      >
                        {Object.entries(ROLE_DEFINITIONS).map(([rKey, rMeta]) => (
                          <option key={rKey} value={rKey} style={{ background: '#fff', color: '#000' }}>
                            {rMeta.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <select
                        disabled={updatingId === u.id}
                        value={u.assigned_sbu}
                        onChange={(e) => handleSbuChange(u, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                        }}
                      >
                        {SBUS.map((sbu) => (
                          <option key={sbu} value={sbu}>
                            {sbu === 'All' ? '🌐 All SBUs (Group)' : sbu}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: u.is_active ? '#dcfce7' : '#fee2e2',
                          color: u.is_active ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {u.email !== 'ybeltalsemagn8899@gmail.com' && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            color: u.is_active ? '#b91c1c' : '#15803d',
                            cursor: 'pointer',
                          }}
                        >
                          {u.is_active ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  )
}