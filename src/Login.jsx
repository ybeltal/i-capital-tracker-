import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState(null)

  async function handleEmailLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both your corporate email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) throw authError

      if (data?.session) {
        onLoginSuccess?.(data.session)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err.message || 'Could not initiate Google authentication.')
      setGoogleLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 15% 20%, rgba(2, 132, 199, 0.15), transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(234, 88, 12, 0.12), transparent 50%), #070d1e',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANEL: EXECUTIVE BRAND & CAPABILITIES */}
        <div
          style={{
            padding: '48px 40px',
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Logo Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <img
                  src="/logo.png"
                  alt="i-Capital Africa Logo"
                  style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  textTransform: 'uppercase',
                }}
              >
                ● Live Governance Gateway
              </span>
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#f8fafc',
                letterSpacing: '-0.5px',
                lineHeight: 1.25,
                margin: '0 0 12px 0',
              }}
            >
              The i-Capital <br />
              <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Commercial Platform
              </span>
            </h1>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 32px 0' }}>
              Multi-SBU pipeline tracking, revenue target governance, and AI-powered tender intelligence for The i-Capital Africa Group.
            </p>

            {/* Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(2, 132, 199, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                    4 Strategic Business Units
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Institute • IIP • DAS • CBS
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(234, 88, 12, 0.15)',
                    border: '1px solid rgba(251, 146, 60, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  ✨
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                    Gemini Multimodal Document Engine
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Automated PDF/Word TOR &amp; RFP Extraction
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  📈
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                    ETB 256.6M Target Realization
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    3× Pipeline Coverage &amp; Stage Governance
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Attribution Footer */}
          <div style={{ paddingTop: 32, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                YS
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                  Developed by Ybeltal Semagn
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Addis Ababa, Ethiopia
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AUTHENTICATION FORM */}
        <div
          style={{
            padding: '48px 40px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              Sign In
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Access your group pipeline, proposals, and target metrics.
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#b91c1c',
                fontSize: '12px',
                lineHeight: 1.4,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.borderColor = '#94a3b8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {googleLoading ? 'Connecting to Google…' : 'Continue with Google / Gmail'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 12px', fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px' }}>
              OR SIGN IN WITH EMAIL
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Corporate Email Address
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    fontSize: 14,
                    color: focusedField === 'email' ? '#0284c7' : '#94a3b8',
                    transition: 'color 0.15s ease',
                  }}
                >
                  ✉️
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@icapital.et or name@gmail.com"
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 36px',
                    borderRadius: '10px',
                    border: focusedField === 'email' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Password
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    fontSize: 14,
                    color: focusedField === 'password' ? '#0284c7' : '#94a3b8',
                    transition: 'color 0.15s ease',
                  }}
                >
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 36px',
                    borderRadius: '10px',
                    border: focusedField === 'password' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#64748b',
                    padding: 4,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              style={{
                marginTop: 8,
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  <span>Authenticating…</span>
                </>
              ) : (
                'Sign In to Platform →'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Authorized Personnel Only • The i-Capital Africa Group
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}