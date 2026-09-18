import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { api, type AiActionProposal } from '../services/api';

interface AiOperatorScreenProps {
  onClose: () => void;
  onSelectAction?: (actionText: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: AiActionProposal;
}

export const AiOperatorScreen: React.FC<AiOperatorScreenProps> = ({ onClose, onSelectAction }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [confirmedActionIds, setConfirmedActionIds] = useState<Set<string>>(new Set());
  // Empty array initially so NO dummy message is displayed!
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendPrompt = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const res = await api.sendAiChat(text, conversationId);
      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.message,
          pendingAction: res.pendingAction,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error connecting to AI: ${err.message || 'Please check backend server connection.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string) => {
    try {
      await api.confirmAiAction(actionId, true);
      setConfirmedActionIds(prev => new Set(prev).add(actionId));
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    }
  };

  const handleCardClick = (promptText: string) => {
    if (onSelectAction) onSelectAction(promptText);
    handleSendPrompt(promptText);
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        minHeight: '940px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── Top Bar (matches Figma) ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '56px',
        }}
      >
        {messages.length > 0 ? (
          <button
            onClick={() => setMessages([])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ArrowLeft size={16} />
            <span>New inquiry</span>
          </button>
        ) : (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '-0.2px',
            }}
          >
            AI agent
          </div>
        )}

        {/* Close / Profile icon */}
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            width: '44px',
            height: '44px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '22px',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF',
            fontSize: '24px',
            lineHeight: 1,
            cursor: 'pointer',
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* ── MAIN CONTENT: Empty State (Screenshot 2) VS Active Conversation ── */}
      {messages.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {/* Floating AI Orb */}
          <div className="animate-float-glow" style={{ marginBottom: '16px' }}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/1bffe6d7126ecf3d5eb9e92e9099d471ba76fc8d?width=460"
              alt="AI Operator Orb"
              style={{
                width: '210px',
                height: '210px',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Heading */}
          <h1
            style={{
              color: '#111111',
              fontSize: '30px',
              fontWeight: 500,
              textAlign: 'center',
              margin: '0 auto 36px auto',
              maxWidth: '310px',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            What would you like to get done today?
          </h1>

          {/* 2x2 Grid of Actions (Screenshot 2) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%',
              marginBottom: '32px',
            }}
          >
            {/* Card 1: Pay Suppliers Quickly */}
            <button
              onClick={() => handleCardClick("Pay Suppliers Quickly")}
              style={{
                display: 'flex',
                height: '78px',
                padding: '12px 14px',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '24px',
                background: '#FFFFFF',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.03)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '22px',
                  background: '#F7F7F8',
                  border: '1px solid #ECECEC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Clover-like icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4c0 2.5-3 5-4 6-1-1-4-3.5-4-6a4 4 0 0 1 4-4z"/>
                  <path d="M22 12a4 4 0 0 1-4 4c-2.5 0-5-3-6-4 1-1 3.5-4 6-4a4 4 0 0 1 4 4z"/>
                  <path d="M12 22a4 4 0 0 1-4-4c0-2.5 3-5 4-6 1 1 4 3.5 4 6a4 4 0 0 1-4 4z"/>
                  <path d="M2 12a4 4 0 0 1 4-4c2.5 0 5 3 6 4-1 1-3.5 4-6 4a4 4 0 0 1-4-4z"/>
                </svg>
              </div>
              <div style={{ color: '#2D2D2D', fontSize: '14px', fontWeight: 500, lineHeight: '1.25' }}>
                Pay Suppliers<br />Quickly
              </div>
            </button>

            {/* Card 2: Track Spending */}
            <button
              onClick={() => handleCardClick("Track Spending")}
              style={{
                display: 'flex',
                height: '78px',
                padding: '12px 14px',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '24px',
                background: '#FFFFFF',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.03)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '22px',
                  background: '#F7F7F8',
                  border: '1px solid #ECECEC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Barcode/Bars icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" />
                  <line x1="7" y1="8" x2="7" y2="16" />
                  <line x1="10" y1="8" x2="10" y2="16" />
                  <line x1="14" y1="8" x2="14" y2="16" />
                  <line x1="17" y1="8" x2="17" y2="16" />
                </svg>
              </div>
              <div style={{ color: '#2D2D2D', fontSize: '14px', fontWeight: 500, lineHeight: '1.25' }}>
                Track<br />Spending
              </div>
            </button>

            {/* Card 3: Create Client Invoices */}
            <button
              onClick={() => handleCardClick("Create Client Invoices")}
              style={{
                display: 'flex',
                height: '78px',
                padding: '12px 14px',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '24px',
                background: '#FFFFFF',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.03)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '22px',
                  background: '#F7F7F8',
                  border: '1px solid #ECECEC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Inset square icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <rect x="8" y="8" width="8" height="8" rx="1" />
                </svg>
              </div>
              <div style={{ color: '#2D2D2D', fontSize: '14px', fontWeight: 500, lineHeight: '1.25' }}>
                Create Client<br />Invoices
              </div>
            </button>

            {/* Card 4: Ask Account Questions */}
            <button
              onClick={() => handleCardClick("Ask Account Questions")}
              style={{
                display: 'flex',
                height: '78px',
                padding: '12px 14px',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '24px',
                background: '#FFFFFF',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.03)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '22px',
                  background: '#F7F7F8',
                  border: '1px solid #ECECEC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Circle with dash */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div style={{ color: '#2D2D2D', fontSize: '14px', fontWeight: 500, lineHeight: '1.25' }}>
                Ask Account<br />Questions
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Active Conversation Area */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '14px 0',
            gap: '14px',
            maxHeight: '680px',
            overflowY: 'auto',
          }}
        >
          {/* Small Floating Orb at top */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/1bffe6d7126ecf3d5eb9e92e9099d471ba76fc8d?width=460"
              alt="AI Operator"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            />
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  background: msg.role === 'user' ? '#25262B' : '#18191D',
                  color: '#FFFFFF',
                  borderRadius:
                    msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                  padding: '14px 18px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  fontSize: '14px',
                  lineHeight: '22px',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {msg.content}

                {/* Action Proposal Card */}
                {msg.pendingAction && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#23242A',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFFFFF', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      <Sparkles size={16} />
                      <span>AI Action Proposal (Requires Confirmation)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#CCCCCC', marginBottom: '10px' }}>
                      Type: {msg.pendingAction.type}
                    </div>
                    {confirmedActionIds.has(msg.pendingAction.id) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ADE80', fontSize: '13px', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        <span>Action Confirmed & Executed!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmAction(msg.pendingAction!.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '16px',
                          background: '#111111',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Confirm via NIMIQ
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#1E1F24',
                  color: '#FFFFFF',
                  borderRadius: '4px 20px 20px 20px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                <span>thinking...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Pill Input Bar (Exact Figma Screenshot 2) ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '62px',
          padding: '6px 8px 6px 18px',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '31px',
          border: '1px solid #E8E8E8',
          background: '#FFFFFF',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          boxSizing: 'border-box',
          marginTop: 'auto',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {/* Half moon / left pill indicator icon from Figma */}
          <div style={{ display: 'flex', alignItems: 'center', color: '#444444' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt(inputValue)}
            placeholder="E-Invoicing Deadline"
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              color: '#111111',
              fontSize: '15px',
              fontWeight: 400,
              background: 'transparent',
            }}
          />
        </div>

        {/* Small orb AI action button on the right */}
        <button
          onClick={() => handleSendPrompt(inputValue || 'E-Invoicing Deadline')}
          disabled={isLoading}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '23px',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          title="Send to AI Operator"
        >
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/1bffe6d7126ecf3d5eb9e92e9099d471ba76fc8d?width=120"
            alt="Ask Operator"
            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
          />
        </button>
      </div>
    </div>
  );
};
