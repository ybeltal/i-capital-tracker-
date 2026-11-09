// src/CrmAssistantChat.jsx
import React, { useState, useRef, useEffect } from 'react'
import { getCrmAssistantResponse, SUGGESTED_TOPICS } from './crmAssistantKnowledge'

export default function CrmAssistantChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '### i-Capital CRM Assistant\nWelcome! Click any topic below or type your question to learn how to navigate the platform.'
    }
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

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
        text: '### i-Capital CRM Assistant\nChat reset. Click any topic below or ask another question.'
      }
    ])
  }

  const renderFormattedText = (text) => {
    const formatted = text
      .replace(/### (.*?)\n/g, '<div style="font-weight: 800; font-size: 13.5px; margin-bottom: 6px; color: #0284c7;">$1</div>')
      .replace(/#### (.*?)\n/g, '<div style="font-weight: 800; font-size: 12px; margin: 8px 0 3px 0; color: #0f172a;">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(2,132,199,0.1); color: #0369a1; padding: 2px 5px; border-radius: 4px; font-weight: 700; font-size: 11px;">$1</code>')
      .replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
            color: '#ffffff',
            border: '2px solid #38bdf8',
            padding: '12px 20px',
            borderRadius: '50px',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span>💬</span>
          <span style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>CRM Flow Guide</span>
        </button>
      )}

      {/* 2. CHAT PANEL */}
      {isOpen && (
        <div
          style={{
            width: '420px',
            height: '580px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '2px solid #0284c7',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
              color: '#ffffff',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                THE i-CAPITAL AFRICA GROUP
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                CRM Flow Assistant
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleReset}
                title="Reset conversation"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔄 Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
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

          {/* PERMANENT SUGGESTIONS BAR (Always visible above the input) */}
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