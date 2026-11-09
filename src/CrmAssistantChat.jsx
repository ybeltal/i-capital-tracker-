// src/CrmAssistantChat.jsx
import React, { useState, useRef, useEffect } from 'react'
import { getCrmAssistantResponse, QUICK_TOPIC_CATEGORIES } from './crmAssistantKnowledge'

export default function CrmAssistantChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '### Welcome to The i-Capital CRM Assistant\nI am your interactive user guide. Ask me anything about logging leads, creating proposals, SBU targets, or stage-gate governance.'
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  // Basic markdown formatter for headings, bold, code, and lists
  const renderFormattedText = (text) => {
    const formatted = text
      .replace(/### (.*?)\n/g, '<div style="font-weight: 800; font-size: 14px; margin-bottom: 6px; color: #0284c7;">$1</div>')
      .replace(/#### (.*?)\n/g, '<div style="font-weight: 800; font-size: 12.5px; margin: 6px 0 3px 0; color: #0f172a;">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(2,132,199,0.1); color: #0369a1; padding: 2px 5px; border-radius: 4px; font-weight: 700; font-size: 11px;">$1</code>')
      .replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. BOLD FLOATING LAUNCHER BUTTON */}
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
            boxShadow: '0 8px 28px rgba(2, 132, 199, 0.4), 0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(2, 132, 199, 0.55)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(2, 132, 199, 0.4)'
          }}
        >
          {/* Pulsing indicator light */}
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '15px' }}>💬</span>
          <span style={{ letterSpacing: '0.3px', textTransform: 'uppercase', color: '#f8fafc', fontWeight: 900 }}>
            CRM Assistant Guide
          </span>
        </button>
      )}

      {/* 2. EXPANDED CHAT PANEL */}
      {isOpen && (
        <div
          style={{
            width: '430px',
            height: '600px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '2px solid #0284c7',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
              color: '#ffffff',
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #0284c7',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  THE i-CAPITAL AFRICA GROUP
                </span>
                <span style={{ background: '#10b981', color: '#ffffff', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px' }}>
                  ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>
                CRM Flow &amp; Operations Assistant
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Guide"
            >
              ✕
            </button>
          </div>

          {/* Quick Filter Ribbon */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '8px 12px',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_TOPIC_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => handleSend(cat.query)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #94a3b8',
                  borderRadius: '14px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  background: m.sender === 'user' ? '#0284c7' : '#ffffff',
                  color: m.sender === 'user' ? '#ffffff' : '#1e293b',
                  padding: '12px 14px',
                  borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '12.5px',
                  lineHeight: '1.55',
                  border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {renderFormattedText(m.text)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: '12px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything about the CRM (e.g., explain, 3.0x rule, add lead)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12.5px',
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
                padding: '0 18px',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}