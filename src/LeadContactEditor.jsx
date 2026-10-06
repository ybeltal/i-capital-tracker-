import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function LeadContactEditor({ leadId }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [savedContact, setSavedContact] = useState(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const inputPrefix = `lead-contact-${leadId}`

  useEffect(() => {
    let cancelled = false

    async function loadContact() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setMessage('')

      try {
        // Load contact details for this specific lead.
        const { data, error } = await supabase
          .from('opportunities')
          .select('contact_name, contact_email, contact_phone')
          .eq('id', leadId)
          .single()

        if (error) throw error

        if (!cancelled) {
          setName(data.contact_name || '')
          setEmail(data.contact_email || '')
          setPhone(data.contact_phone || '')
          setSavedContact(data)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load contact details.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadContact()

    return () => {
      cancelled = true
    }
  }, [leadId])

  async function handleSave(event) {
    event.preventDefault()
    if (busy || loading) return

    setBusy(true)
    setSaveError('')
    setMessage('')

    try {
      // Save only contact fields; other lead details stay untouched.
      // Empty fields are stored as null.
      const { data, error } = await supabase
        .from('opportunities')
        .update({
          contact_name: name.trim() || null,
          contact_email: email.trim() || null,
          contact_phone: phone.trim() || null,
        })
        .eq('id', leadId)
        .select('contact_name, contact_email, contact_phone')
        .single()

      if (error) throw error

      setName(data.contact_name || '')
      setEmail(data.contact_email || '')
      setPhone(data.contact_phone || '')
      setSavedContact(data)
      setMessage('Contact details saved successfully.')
    } catch (err) {
      setSaveError(err.message || 'Could not save contact details.')
    } finally {
      setBusy(false)
    }
  }

  // Make a phone link only when the saved number can be recognized.
  const phoneForLink = (savedContact?.contact_phone || '')
    .replace(/[\s().-]/g, '')

  const canCall = /^\+?\d{5,15}$/.test(phoneForLink)

  const emailForLink = savedContact?.contact_email || ''
  const canEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForLink)

  return (
    <section style={{ marginTop: 24, marginBottom: 24 }}>
      <h3>Lead contact details</h3>

      {loading && <p role="status">Loading contact details…</p>}

      {loadError && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          <form onSubmit={handleSave} style={{ maxWidth: 600 }}>
            <label htmlFor={`${inputPrefix}-name`}>
              Contact person
            </label>

            <input
              id={`${inputPrefix}-name`}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contact person's full name"
              disabled={busy}
            />

            <label htmlFor={`${inputPrefix}-email`}>
              Email address
            </label>

            <input
              id={`${inputPrefix}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              disabled={busy}
            />

            <label htmlFor={`${inputPrefix}-phone`}>
              Phone number
            </label>

            <input
              id={`${inputPrefix}-phone`}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Include the country code, for example +251"
              disabled={busy}
            />

            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save contact details'}
            </button>
          </form>

          {message && (
            <p role="status" style={{ color: '#166534' }}>
              {message}
            </p>
          )}

          {saveError && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {saveError}
            </p>
          )}

          {/* These links use saved details, not unsaved changes. */}
          {(canEmail || canCall) && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                marginTop: 16,
              }}
            >
              {canEmail && (
                <a href={`mailto:${emailForLink}`}>
                  Email contact
                </a>
              )}

              {canCall && (
                <a href={`tel:${phoneForLink}`}>
                  Call contact
                </a>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}