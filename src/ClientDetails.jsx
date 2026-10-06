import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import LeadEditor from './LeadEditor'
import ProposalEditor from './ProposalEditor'

function formatMoney(value) {
  if (value === null || value === undefined) return '—'

  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

export default function ClientDetails({ client }) {
  const [leads, setLeads] = useState([])
  const [proposals, setProposals] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const clientId = client.id

  useEffect(() => {
    let cancelled = false

    async function loadRecords() {
      setLoading(true)
      setError('')
      setSelectedLead(null)
      setSelectedProposal(null)

      try {
        // Fetch this client's leads and proposals separately.
        // Proposals are linked to clients through their parent leads.
        const [leadResult, proposalResult] = await Promise.all([
          supabase
            .from('opportunities')
            .select(`
              id, lead_code, title, qualification_status,
              priority, notes, initiated_date,
              clients(name),
              sbus(code)
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(100),

          supabase
            .from('proposals')
            .select(`
              id, proposal_code, title, status,
              submission_deadline, actual_submission_date,
              deal_value_etb, notes,
              opportunities!inner(
                id, title, client_id,
                clients(name),
                sbus(code)
              )
            `)
            .eq('opportunities.client_id', clientId)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(100),
        ])

        if (leadResult.error) throw leadResult.error
        if (proposalResult.error) throw proposalResult.error

        if (!cancelled) {
          setLeads(leadResult.data || [])
          setProposals(proposalResult.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load client records.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRecords()

    // Ignore responses if the user switches to another client.
    return () => {
      cancelled = true
    }
  }, [clientId, refreshVersion])

  // Update this view immediately after a lead is saved.
  function handleLeadSaved(updatedLead) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === updatedLead.id
          ? { ...lead, ...updatedLead }
          : lead
      )
    )

    setSelectedLead((current) =>
      current?.id === updatedLead.id
        ? { ...current, ...updatedLead }
        : current
    )
  }

  // Update this view immediately after a proposal is saved.
  function handleProposalSaved(updatedProposal) {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.id === updatedProposal.id
          ? { ...proposal, ...updatedProposal }
          : proposal
      )
    )

    setSelectedProposal((current) =>
      current?.id === updatedProposal.id
        ? { ...current, ...updatedProposal }
        : current
    )
  }

  return (
    <section aria-label={`Linked records for ${client.name}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 20,
        }}
      >
        <h3>Linked leads and proposals</h3>

        <button
          type="button"
          disabled={loading}
          onClick={() => setRefreshVersion((version) => version + 1)}
        >
          {loading ? 'Loading…' : 'Refresh client records'}
        </button>
      </div>

      {loading && <p role="status">Loading client records…</p>}

      {error && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p>
            This view loads up to 100 recent leads and 100 recent
            proposals for this client. Click a title to open its editor
            and activity history.
          </p>

          <h4>Leads — {leads.length} loaded</h4>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Lead code</th>
                  <th>Lead title</th>
                  <th>SBU</th>
                  <th>Qualification</th>
                  <th>Priority</th>
                </tr>
              </thead>

              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      No leads are linked to this client.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.lead_code || '—'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead)
                            setSelectedProposal(null)
                          }}
                        >
                          {lead.title}
                        </button>
                      </td>
                      <td>{lead.sbus?.code || '—'}</td>
                      <td>{lead.qualification_status}</td>
                      <td>{lead.priority}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedLead && (
            <LeadEditor
              key={selectedLead.id}
              lead={selectedLead}
              onSaved={handleLeadSaved}
              onClose={() => setSelectedLead(null)}
            />
          )}

          <h4>Proposals — {proposals.length} loaded</h4>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Proposal code</th>
                  <th>Proposal title</th>
                  <th>Linked lead</th>
                  <th>SBU</th>
                  <th>Status</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                {proposals.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      No proposals are linked to this client.
                    </td>
                  </tr>
                ) : (
                  proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td>{proposal.proposal_code || '—'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProposal(proposal)
                            setSelectedLead(null)
                          }}
                        >
                          {proposal.title}
                        </button>
                      </td>
                      <td>{proposal.opportunities?.title || '—'}</td>
                      <td>
                        {proposal.opportunities?.sbus?.code || '—'}
                      </td>
                      <td>{proposal.status}</td>
                      <td>{formatMoney(proposal.deal_value_etb)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedProposal && (
            <ProposalEditor
              key={selectedProposal.id}
              proposal={selectedProposal}
              onSaved={handleProposalSaved}
              onClose={() => setSelectedProposal(null)}
            />
          )}
        </>
      )}
    </section>
  )
}