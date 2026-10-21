import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthRoleContext = createContext(null)

export const ROLE_DEFINITIONS = {
  admin: {
    label: 'Executive Administrator',
    badgeBg: '#dc2626',
    badgeText: '#ffffff',
    canManageUsers: true,
    canOverrideGovernance: true,
    canDeleteDeals: true,
  },
  exec_mgmt: {
    label: 'Senior Management',
    badgeBg: '#7c3aed',
    badgeText: '#ffffff',
    canManageUsers: false,
    canOverrideGovernance: false,
    canDeleteDeals: false,
  },
  bd_manager: {
    label: 'BD Manager',
    badgeBg: '#0284c7',
    badgeText: '#ffffff',
    canManageUsers: false,
    canOverrideGovernance: false,
    canDeleteDeals: false,
  },
  sales_officer: {
    label: 'Relationship & Sales',
    badgeBg: '#ea580c',
    badgeText: '#ffffff',
    canManageUsers: false,
    canOverrideGovernance: false,
    canDeleteDeals: false,
  },
  tech_lead: {
    label: 'Technical Proposal Lead',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    canManageUsers: false,
    canOverrideGovernance: false,
    canDeleteDeals: false,
  },
  read_only: {
    label: 'Read-Only User',
    badgeBg: '#64748b',
    badgeText: '#ffffff',
    canManageUsers: false,
    canOverrideGovernance: false,
    canDeleteDeals: false,
  },
}

export function AuthRoleProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(currentUser = null) {
    try {
      let user = currentUser
      if (!user) {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user
      }

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const email = user.email ? user.email.toLowerCase() : ''
      const isYbeltalAdmin = email.includes('ybeltal') || email === 'ybeltalsemagn8899@gmail.com'

      // Query database profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && data) {
        setProfile({
          ...data,
          // Guarantee admin permissions for your primary account
          role: isYbeltalAdmin ? 'admin' : data.role,
          assigned_sbu: isYbeltalAdmin ? 'All' : data.assigned_sbu,
        })
      } else {
        // Immediate fallback with Admin guarantee for Ybeltal
        setProfile({
          id: user.id,
          email: user.email,
          role: isYbeltalAdmin ? 'admin' : 'read_only',
          assigned_sbu: isYbeltalAdmin ? 'All' : 'Institute',
          is_active: true,
        })
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const role = profile?.role || 'read_only'
  const assignedSbu = profile?.assigned_sbu || 'All'
  const isAdmin = role === 'admin'
  const isManagement = role === 'admin' || role === 'exec_mgmt'
  const isReadOnly = role === 'read_only'

  function canEditSbu(dealSbu) {
    if (isReadOnly) return false
    if (isAdmin || role === 'exec_mgmt' || assignedSbu === 'All') return true
    if (!dealSbu) return true

    const cleanDeal = dealSbu.toLowerCase()
    const cleanUser = assignedSbu.toLowerCase()
    return cleanDeal.includes(cleanUser) || cleanUser.includes(cleanDeal)
  }

  const value = {
    profile,
    role,
    roleMeta: ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.read_only,
    assignedSbu,
    isAdmin,
    isManagement,
    isReadOnly,
    canEditSbu,
    refreshProfile: fetchUserProfile,
    loadingRole: loading,
  }

  return (
    <AuthRoleContext.Provider value={value}>
      {children}
    </AuthRoleContext.Provider>
  )
}

export function useAuthRole() {
  const ctx = useContext(AuthRoleContext)
  if (!ctx) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider')
  }
  return ctx
}