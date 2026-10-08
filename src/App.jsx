import { useEffect, useState } from 'react'
import AccessCheck from './AccessCheck'
import './App.css'
import Login from './Login'
import { supabase } from './supabase'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 1. Check existing session on load
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setLoading(false)
    })

    // 2. Listen for sign-in / sign-out events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        setLoading(false)
      }
    )

    return () => authListener.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (error) {
      setMessage(error.message || 'Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HubSpot Top Enterprise Bar */}
      <header style={{ height: 60, backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#ff7a59', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
            i
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', display: 'block' }}>The i-Capital CRM</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Lead & Proposal CRM</span>
          </div>
        </div>

        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>{session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace Area */}
      <main style={{ flex: 1, padding: session ? '20px 32px' : 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Verifying your workspace credentials…
          </div>
        ) : session ? (
          <div>
            {message && <p role="alert" style={{ color: '#b91c1c' }}>{message}</p>}
            {/* AccessCheck handles the verified user and workspace views */}
            <AccessCheck key={session.user.id} userId={session.user.id} />
          </div>
        ) : (
          <div style={{ maxWidth: 440, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <Login />
          </div>
        )}
      </main>
    </div>
  )
}

export default App