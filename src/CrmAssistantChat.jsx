// src/CrmAssistantChat.jsx
import React, { useState, useRef, useEffect } from 'react'
import { getCrmAssistantResponse, SUGGESTED_TOPICS } from './crmAssistantKnowledge'

const STORAGE_KEY = 'icapital_crm_guide_pos_v1'
const LAUNCHER_WIDTH = 215
const LAUNCHER_HEIGHT = 48
const PANEL_WIDTH = 420
const PANEL_HEIGHT = 560

function clampPosition(x, y, boxW, boxH) {
  if (typeof window === 'undefined') return { x: 20, y: 20 }
  const maxX = Math.max(12, window.innerWidth - boxW - 12)
  const maxY = Math.max(12, window.innerHeight - boxH - 12)
  return {
    x: Math.min(Math.max(12, x), maxX),
    y: Math.min(Math.max(12, y), maxY),
  }
}

function getDefaultLauncherPos() {
  if (typeof window === 'undefined') return { x: 24, y: 24 }
  return clampPosition(
    window.innerWidth - LAUNCHER_WIDTH - 24,
    window.innerHeight - LAUNCHER_HEIGHT - 24,
    LAUNCHER_WIDTH,
    LAUNCHER_HEIGHT
  )
}

export default function CrmAssistantChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampPosition(parsed.x, parsed.y, LAUNCHER_WIDTH, LAUNCHER_HEIGHT)
        }
      }
    } catch {
      // Ignore storage errors
    }
    return getDefaultLauncherPos()
  })

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '### i-Capital CRM Assistant\nWelcome! Click any topic below or type your question to learn how to navigate the platform.',
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  })

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Keep button/panel safely inside viewport on browser resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const w = isOpen ? Math.min(PANEL_WIDTH, window.innerWidth - 24) : LAUNCHER_WIDTH
        const h = isOpen ? Math.min(PANEL_HEIGHT, window.innerHeight - 24) : LAUNCHER_HEIGHT
        return clampPosition(prev.x, prev.y, w, h)
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  // Global mouse & touch listeners for smooth dragging
  useEffect(() => {
    const onMove = (clientX, clientY) => {
      if (!dragStateRef.current.active) return
      const dx = clientX - dragStateRef.current.startX
      const dy = clientY - dragStateRef.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragStateRef.current.moved = true
      }
      const w = isOpen ? Math.min(PANEL_WIDTH, window.innerWidth - 24) : LAUNCHER_WIDTH
      const h = isOpen ? Math.min(PANEL_HEIGHT, window.innerHeight - 24) : LAUNCHER_HEIGHT
      const next = clampPosition(
        dragStateRef.current.origX + dx,
        dragStateRef.current.origY + dy,
        w,
        h
      )
      setPosition(next)
    }

    const handleMouseMove = (e) => onMove(e.clientX, e.clientY)
    const handleTouchMove = (e) => {
      if (e.touches?.[0]) {
        onMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      if (!dragStateRef.current.active) return
      dragStateRef.current.active = false
      setIsDragging(false)
      setPosition((latest) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(latest))
        } catch {
          // Ignore storage errors
        }
        return latest
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isOpen])

  const startDrag = (clientX, clientY) => {
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: clientX,
      startY: clientY,
      origX: position.x,
      origY: position.y,
    }
    setIsDragging(true)
  }

  const handleLauncherClick = () => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false
      return
    }
    const panelW = Math.min(PANEL_WIDTH, window.innerWidth - 24)
    const panelH = Math.min(PANEL_HEIGHT, window.innerHeight - 24)
    setPosition((prev) => clampPosition(prev.x, prev.y, panelW, panelH))
    setIsOpen(true)
  }

  const handleDockBottomRight = () => {
    const def = getDefaultLauncherPos()
    setPosition(def)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(def))
    } catch {
      // Ignore storage errors
    }
  }

  const handleSend = (textToSend) => {
    const query = textToSend || input
    if (!query.trim()) return

    const userMsg = { sender: 'user', text: query.trim() }
    const botReply = { sender: 'bot', text: getCrmAssistantResponse(query) }

    setMessages((prev) => [...prev, userMsg, botReply])
    setInput('')
  }

  const handleReset = () => {
    setMessages([
      {
        sender: 'bot',
        text: '### i-Capital CRM Assistant\nChat reset. Click any topic below or ask another question.',
      },
    ])
  }

  const renderFormattedText = (text) => {
    const formatted = text
      .replace(
        /### (.*?)\n/g,
        '<div style="font-weight: 800; font-size: 13.5px; margin-bottom: 6px; color: #0284c7;">$1</div>'
      )
      .replace(
        /#### (.*?)\n/g,
        '<div style="font-weight: 800; font-size: 12px; margin: 8px 0 3px 0; color: #0f172a;">$1</div>'
      )
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(
        /`([^`]+)`/g,
        '<code style="background: rgba(2,132,199,0.1); color: #0369a1; padding: 2px 5px; border-radius: 4px; font-weight: 700; font-size: 11px;">$1</code>'
      )
      .replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  // Compute safe clamped coordinates for rendering
  const activeBoxW =
    typeof window !== 'undefined'
      ? isOpen
        ? Math.min(PANEL_WIDTH, window.innerWidth - 24)
        : LAUNCHER_WIDTH
      : LAUNCHER_WIDTH
  const activeBoxH =
    typeof window !== 'undefined'
      ? isOpen
        ? Math.min(PANEL_HEIGHT, window.innerHeight - 24)
        : LAUNCHER_HEIGHT
      : LAUNCHER_HEIGHT
  const safePos = clampPosition(position.x, position.y, activeBoxW, activeBoxH)

  return (
    <div
      style={{
        position: 'fixed',
        left: `${safePos.x}px`,
        top: `${safePos.y}px`,
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* 1. MOVABLE FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          type="button"
          title="Drag anywhere to move • Click to open CRM Flow Guide"
          onMouseDown={(e) => {
            if (e.button !== 0) return
            startDrag(e.clientX, e.clientY)
          }}
          onTouchStart={(e) => {
            if (e.touches?.[0]) {
              startDrag(e.touches[0].clientX, e.touches[0].clientY)
            }
          }}
          onClick={handleLauncherClick}
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f2942 100%)',
            color: '#ffffff',
            border: '2px solid #38bdf8',
            padding: '10px 16px',
            borderRadius: '50px',
            fontWeight: 800,
            fontSize: '12.5px',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: isDragging
              ? '0 14px 32px rgba(2, 132, 199, 0.55)'
              : '0 8px 22px rgba(15, 41, 66, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
          }}
        >
          <span style={{ opacity: 0.7, fontSize: '13px', letterSpacing: '-1px' }}>⋮⋮</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }}
          />
          <span>💬</span>
          <span style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>CRM Flow Guide</span>
        </button>
      )}

      {/* 2. DRAGGABLE CHAT PANEL */}
      {isOpen && (
        <div
          style={{
            width: `${activeBoxW}px`,
            height: `${activeBoxH}px`,
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 22px 55px rgba(0, 0, 0, 0.38)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '2px solid #0284c7',
          }}
        >
          {/* Draggable Header */}
          <div
            onMouseDown={(e) => {
              if (e.target.closest('button')) return
              if (e.button !== 0) return
              startDrag(e.clientX, e.clientY)
            }}
            onTouchStart={(e) => {
              if (e.target.closest('button')) return
              if (e.touches?.[0]) {
                startDrag(e.touches[0].clientX, e.touches[0].clientY)
              }
            }}
            title="Drag header to move window"
            style={{
              background: 'linear-gradient(135deg, #070d1e 0%, #0f2942 100%)',
              color: '#ffffff',
              padding: '13px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '14px' }}>⋮⋮</span>
              <div>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 900,
                    color: '#38bdf8',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  THE i-CAPITAL AFRICA GROUP
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                  CRM Flow Assistant
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleDockBottomRight}
                title="Reset position to bottom-right"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 7px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ↘ Dock
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔄 Reset
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close CRM Flow Guide"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  background: m.sender === 'user' ? '#0284c7' : '#ffffff',
                  color: m.sender === 'user' ? '#ffffff' : '#1e293b',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {renderFormattedText(m.text)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Permanent Suggestions Bar */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '6px 10px',
              borderTop: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {SUGGESTED_TOPICS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(item.query)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div style={{ padding: '10px', background: '#ffffff', display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Type any question (or pick a topic above)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}