import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function ClientList({ clientVersion }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    loadClients()
  }, [clientVersion])

  async function loadClients() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select(`
          id,
          client_code,
          name,
          sector,
          created_at,
          opportunities (
            id,
            title,
            qualification_status,
            proposals (id, proposal_code, title, status, deal_value_etb)
          )
        `)
        .order('name', { ascending: true })

      if (err) throw err
      setClients(data || [])
    } catch (err) {
      setError(err.message || 'Could not load clients.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.sector?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Account 360° Client Intelligence Dossier</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Consolidated directory of corporate clients, financial institutions, and past proposals.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search by institution name or sector..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', width: 280, fontSize: 13 }}
        />
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Loading client directory…</p>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((client) => {
            const opps = client.opportunities || []
            const proposals = opps.flatMap((o) => o.proposals || [])
            const totalValue = proposals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {client.client_code || 'CLIENT'}
                  </span>
                  <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>{client.sector || 'Corporate'}</span>
                </div>

                <strong style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                  {client.name}
                </strong>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                  <span>{proposals.length} Proposals Linked</span>
                  <strong style={{ color: '#0f172a' }}>
                    ETB {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Account Dossier Drawer */}
      {selectedClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              height: '100vh',
              background: '#fff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              padding: 24,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 700 }}>{selectedClient.sector}</span>
                <h3 style={{ margin: '4px 0 2px 0', color: '#0f172a' }}>{selectedClient.name}</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{selectedClient.client_code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ marginTop: 24, marginBottom: 12, color: '#1e293b' }}>Linked Proposals & Deals</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(selectedClient.opportunities?.flatMap((o) => o.proposals || []) || []).map((prop) => (
                <div key={prop.id} style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>{prop.proposal_code}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{prop.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, marginBottom: 6 }}>{prop.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    ETB {Number(prop.deal_value_etb || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
              {(selectedClient.opportunities?.flatMap((o) => o.proposals || []) || []).length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No active proposals registered for this organization yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}