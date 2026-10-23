import React, { useState, useEffect } from 'react'

const TOUR_STEPS = [
  {
    targetId: 'tour-coverage-gauge',
    badge: 'Step 1 of 4: Revenue Governance',
    title: '3.0× Pipeline Coverage Gauge',
    icon: '📊',
    color: '#0284c7',
    description:
      'This gauge enforces our commercial rule: to hit the ETB 256.60M revenue target, the institute must maintain at least 3× qualified pipeline (ETB 769.78M). Check your SBU gap here daily.',
    actionTip: 'Tip: SBU heads should keep active proposals in the green zone above 3.0×.',
  },
  {
    targetId: 'tour-quick-actions',
    badge: 'Step 2 of 4: Proposal Ingestion',
    title: 'AI Tender Parser & Quick Actions',
    icon: '✨',
    color: '#ea580c',
    description:
      'Click "✨ AI Tender Parser" to upload institutional TOR or RFP documents. Gemini multimodal AI will automatically extract evaluation criteria, required expert profiles, and submission deadlines.',
    actionTip: 'Tip: BD Managers can also register quick client discovery via "+ New Lead".',
  },
  {
    targetId: 'tour-pipeline-tabs',
    badge: 'Step 3 of 4: Stage-Gate Management',
    title: '4-Stage Commercial Pipeline',
    icon: '🛡️',
    color: '#10b981',
    description:
      'Manage every mandate through 4 governance gates: 0. Pre-Tender Lead, 1. TOR Identified (Go/No-Go Gate), 2. Proposal In Defense, and 3. Won / Signed Contract.',
    actionTip: 'Tip: Proposals cannot advance to Defense without passing Go/No-Go checks.',
  },
  {
    targetId: 'tour-executive-dossier',
    badge: 'Step 4 of 4: Reporting & Manual',
    title: 'Executive Dossier & Role Manual',
    icon: '🖨️',
    color: '#7c3aed',
    description:
      'Generate a 1-page PDF briefing for board and executive committee meetings with one click. For detailed daily tasks, open the "📘 User Manual & SOP" button at any time.',
    actionTip: 'Tip: You are fully set up! Log in and start tracking your active pipeline.',
  },
]

export default function SpotlightTour({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const step = TOUR_STEPS[currentStep]

  // Measure and position the highlight box around target elements if present
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      setTargetRect(null)
      return
    }

    function updatePosition() {
      const el = document.getElementById(step.targetId)
      if (el) {
        const r = el.getBoundingClientRect()
        setTargetRect({
          top: r.top - 6,
          left: r.left - 6,
          width: r.width + 12,
          height: r.height + 12,
        })
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        setTargetRect(null)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1)
      }
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((s) => s - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, currentStep, step.targetId, onClose])

  if (!isOpen) return null

  const isLast = currentStep === TOUR_STEPS.length - 1

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        pointerEvents: 'auto',
      }}
    >
      {/* Dimmed backdrop with optional spotlight cutout */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7, 13, 30, 0.78)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Target element highlight box if located */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            border: `3px solid ${step.color}`,
            borderRadius: 8,
            boxShadow: `0 0 25px ${step.color}60`,
            pointerEvents: 'none',
            zIndex: 10000000,
            transition: 'all 0.25s ease-out',
          }}
        />
      )}

      {/* Interactive Tour Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          padding: 24,
          zIndex: 10000001,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Step Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: step.color,
              background: `${step.color}15`,
              padding: '4px 10px',
              borderRadius: 20,
            }}
          >
            {step.badge}
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 26 }}>{step.icon}</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
            {step.title}
          </h3>
        </div>

        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: '0 0 14px 0' }}>
          {step.description}
        </p>

        <div
          style={{
            background: '#f8fafc',
            borderLeft: `3px solid ${step.color}`,
            padding: '8px 12px',
            borderRadius: '0 6px 6px 0',
            fontSize: 11,
            color: '#334155',
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          {step.actionTip}
        </div>

        {/* Navigation & Progress Dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentStep(i)}
                style={{
                  width: i === currentStep ? 20 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: i === currentStep ? step.color : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onClose()
                } else {
                  setCurrentStep((s) => s + 1)
                }
              }}
              style={{
                padding: '7px 18px',
                borderRadius: 6,
                border: 'none',
                background: step.color,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {isLast ? 'Complete Tour ✓' : 'Next Step →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}