import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  // Remember what the user types into the form.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(event) {
    // Submit through Supabase without reloading the page.
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
      setPassword('')
      setMessage('Signed in successfully.')
    } catch (error) {
      setMessage(error.message || 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel login-panel">
      <h2>Sign in to your tracker</h2>
      <p>Use the account we created in Supabase.</p>

      <form onSubmit={handleLogin}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
          required
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}