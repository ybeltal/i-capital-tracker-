import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Allow ordinary website links, including Google Drive links.
function safeDocumentLink(value) {
  if (!value) return null

  try {
    const url = new URL(value)

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export default function ProposalDocumentEditor({ proposalId }) {
  const [documentUrl, setDocumentUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDocumentLink() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setMessage('')

      try {
        // Load the document link for this specific proposal.
        const { data, error } = await supabase
          .from('proposals')
          .select('document_url')
          .eq('id', proposalId)
          .single()

        if (error) throw error

        if (!cancelled) {
          setDocumentUrl(data.document_url || '')
          setSavedUrl(data.document_url || '')
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load the document link.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDocumentLink()

    return () => {
      cancelled = true
    }
  }, [proposalId])

  async function handleSave(event) {
    event.preventDefault()
    if (busy || loading) return

    setSaveError('')
    setMessage('')

    const enteredUrl = documentUrl.trim()
    const cleanUrl = enteredUrl ? safeDocumentLink(enteredUrl) : null

    if (enteredUrl && !cleanUrl) {
      setSaveError('Enter a complete link beginning with https:// or http://.')
      return
    }

    setBusy(true)

    try {
      // Save only the document link.
      // Leaving the field empty removes the saved link.
      const { data, error } = await supabase
        .from('proposals')
        .update({ document_url: cleanUrl })
        .eq('id', proposalId)
        .select('document_url')
        .single()

      if (error) throw error

      setDocumentUrl(data.document_url || '')
      setSavedUrl(data.document_url || '')
      setMessage(
        data.document_url
          ? 'Document link saved successfully.'
          : 'Document link cleared.'
      )
    } catch (err) {
      setSaveError(err.message || 'Could not save the document link.')
    } finally {
      setBusy(false)
    }
  }

  const openLink = safeDocumentLink(savedUrl)

  return (
    <section style={{ marginTop: 24, marginBottom: 24 }}>
      <h3>Proposal document</h3>

      {loading && <p role="status">Loading document link…</p>}

      {loadError && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          <form onSubmit={handleSave} style={{ maxWidth: 600 }}>
            <label htmlFor={`proposal-document-${proposalId}`}>
              Document or folder link
            </label>

            <input
              id={`proposal-document-${proposalId}`}
              type="url"
              value={documentUrl}
              onChange={(event) => setDocumentUrl(event.target.value)}
              placeholder="Paste the complete Google Drive or document link"
              disabled={busy}
            />

            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save document link'}
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

          {openLink ? (
            <p>
              <a
                href={openLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open proposal document or folder
              </a>
            </p>
          ) : (
            <p>No usable document link is saved.</p>
          )}

          <p style={{ color: '#64748b', fontSize: 13 }}>
            This stores a link. Access to the document depends on its
            sharing permissions.
          </p>
        </>
      )}
    </section>
  )
}