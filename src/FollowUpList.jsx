import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Get today's date using the user's local calendar.
function todayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// Only make ordinary web links clickable.
function safeLink(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
      ? url.href
      : null
  } catch {
    return null
  }
}

export default function FollowUpList({
  opportunityId = null,
  proposalId = null,
  activityVersion = 0,
}) {
  const [result, setResult] = useState({
    loading: true,
    activities: [],
    error: '',
  })
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadActivities() {
      setResult({
        loading: true,
        activities: [],
        error: '',
      })

      try {
        if (Boolean(opportunityId) === Boolean(proposalId)) {
          throw new Error('Open one lead or proposal to view its activities.')
        }

        // Load activities only for the record currently open.
        let query = supabase
          .from('follow_up_logs')
          .select(`
            id,
            activity_date,
            activity_type,
            summary,
            outcome,
            next_action,
            next_action_date,
            next_action_completed,
            evidence_url,
            notes
          `)

        query = proposalId
          ? query.eq('proposal_id', proposalId)
          : query.eq('opportunity_id', opportunityId)

        const { data, error } = await query
          .order('activity_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(100)

        if (error) throw error

        if (!cancelled) {
          setResult({
            loading: false,
            activities: data || [],
            error: '',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            loading: false,
            activities: [],
            error: error.message || 'Could not load activities.',
          })
        }
      }
    }

    loadActivities()

    return () => {
      cancelled = true
    }
  }, [opportunityId, proposalId, activityVersion])

  // Calculate the next action's due status from its saved date.
  function dueStatus(activity) {
    if (!activity.next_action) return 'No next action'
    if (activity.next_action_completed) return 'Completed'
    if (!activity.next_action_date) return 'Date needed'

    const today = todayDate()
    if (activity.next_action_date < today) return 'Overdue'
    if (activity.next_action_date === today) return 'Due today'
    return 'Upcoming'
  }

  async function changeCompletion(activity) {
    setBusyId(activity.id)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('follow_up_logs')
        .update({
          next_action_completed: !activity.next_action_completed,
        })
        .eq('id', activity.id)
        .eq('next_action_completed', activity.next_action_completed)
        .select('id, next_action_completed')
        .single()

      if (error) throw error

      // Update the displayed activity after the database saves it.
      setResult((current) => ({
        ...current,
        activities: current.activities.map((item) =>
          item.id === data.id ? { ...item, ...data } : item
        ),
      }))

      setMessage(
        data.next_action_completed
          ? 'Next action marked complete.'
          : 'Next action reopened.'
      )
    } catch (error) {
      setMessage(error.message || 'Could not update the next action.')
    } finally {
      setBusyId(null)
    }
  }

  if (result.loading) return <p>Loading activity history...</p>
  if (result.error) return <p role="alert">{result.error}</p>

  return (
    <section aria-label="Activity history">
      <h3>Activity History</h3>
      <p>
        Showing {result.activities.length} activities.
        {' '}History covers the latest 100 activities for this record.
      </p>

      {message && <p role="status">{message}</p>}

      {result.activities.length === 0 ? (
        <p>No activities have been saved for this record yet.</p>
      ) : (
        result.activities.map((activity) => (
          <article
            key={activity.id}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h4>
              {activity.activity_type} — {formatDate(activity.activity_date)}
            </h4>

            <p style={{ whiteSpace: 'pre-wrap' }}>{activity.summary}</p>

            {activity.outcome && (
              <p>
                <strong>Outcome: </strong>
                {activity.outcome}
              </p>
            )}

            {activity.next_action && (
              <>
                <p>
                  <strong>Next action: </strong>
                  {activity.next_action}
                </p>
                <p>
                  <strong>Next action date: </strong>
                  {formatDate(activity.next_action_date)}
                </p>
                <p>
                  <strong>Due status: </strong>
                  {dueStatus(activity)}
                </p>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => changeCompletion(activity)}
                >
                  {busyId === activity.id
                    ? 'Saving...'
                    : activity.next_action_completed
                      ? 'Reopen Next Action'
                      : 'Mark Next Action Complete'}
                </button>
              </>
            )}

            {safeLink(activity.evidence_url) && (
              <p>
                <a
                  href={safeLink(activity.evidence_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open evidence / document
                </a>
              </p>
            )}

            {activity.notes && (
              <p style={{ whiteSpace: 'pre-wrap' }}>
                <strong>Notes: </strong>
                {activity.notes}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  )
}