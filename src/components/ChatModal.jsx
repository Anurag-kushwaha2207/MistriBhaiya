import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { playMessageChime } from '../sounds';

export default function ChatModal({
  booking,
  token,
  user,
  onClose,
  onStartCall,
  showToast,
  t
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const bookingId = booking?.id;
  const kind = booking?.kind || 'bookings';
  const otherName = booking?.other_name || (user?.role === 'worker' ? booking?.customer_name : booking?.worker_name) || 'साथी';
  const otherPhone = booking?.other_phone || (user?.role === 'worker' ? booking?.customer_phone : booking?.worker_phone) || '';
  const otherId = booking?.other_id || (user?.role === 'worker' ? booking?.customer_id : booking?.worker_id);
  const otherAvatar = booking?.other_avatar;

  const scrollToBottom = (smooth = true) => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Load chat history
  const loadMessages = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await api(`/${kind}/${bookingId}/messages`, 'GET', null, token);
      setMessages(res.messages || []);
      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      showToast(err.message || 'चैट लोड नहीं हो सकी');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  // Listen to incoming real-time chat messages over WebSocket
  useEffect(() => {
    const handleIncoming = (e) => {
      const m = e.detail;
      if (m && m.type === 'chat' && String(m.ref_id) === String(bookingId)) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            mine: false,
            from: m.from || otherName,
            text: m.text,
            at: Date.now() / 1000
          }
        ]);
        playMessageChime(false);
      }
    };

    window.addEventListener('mistri_chat_message', handleIncoming);
    return () => {
      window.removeEventListener('mistri_chat_message', handleIncoming);
    };
  }, [bookingId, otherName]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || sending) return;

    setSending(true);
    try {
      const res = await api(`/${kind}/${bookingId}/messages`, 'POST', { text: cleanText }, token);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          mine: true,
          from: user?.name || 'You',
          text: res.text || cleanText,
          at: Date.now() / 1000
        }
      ]);
      setText('');
      playMessageChime(true);
    } catch (err) {
      showToast(err.message || 'संदेश नहीं भेजा जा सका');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTriggerCall = () => {
    if (onStartCall) {
      onStartCall({
        name: otherName,
        phone: otherPhone,
        booking_id: bookingId,
        target_user_id: otherId
      });
    } else if (otherPhone) {
      window.location.href = `tel:${otherPhone}`;
    } else {
      showToast('फोन नंबर उपलब्ध नहीं है');
    }
  };

  return (
    <div
      className="modal"
      id="chatui"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        zIndex: 999
      }}
      onClick={(e) => { if (e.target.className === 'modal') onClose(); }}
    >
      <div
        className="sheet"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '85vh',
          maxHeight: '680px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          background: '#f0f2f5'
        }}
      >
        {/* WhatsApp Style Top Header */}
        <div
          style={{
            background: '#1b5e20',
            color: '#fff',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                padding: '4px 6px',
                cursor: 'pointer'
              }}
              title="बंद करें"
            >
              ←
            </button>

            {otherAvatar ? (
              <img
                src={otherAvatar}
                alt=""
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #fff' }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                👤
              </div>
            )}

            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', lineHeight: '1.2' }}>{otherName}</div>
              <div style={{ fontSize: '11px', color: '#a5d6a7' }}>● ऑनलाइन · इन-ऐप चैट</div>
            </div>
          </div>

          {/* Right Header Controls: Calling Button + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTriggerCall}
              style={{
                background: '#2e7d32',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              title="कॉल करें"
            >
              📞 <span>कॉल</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '0 6px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Booking Context Pill */}
        <div
          style={{
            background: '#e8f5e9',
            borderBottom: '1px solid #c8e6c9',
            padding: '6px 14px',
            fontSize: '12px',
            color: '#2e7d32',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span><b>काम:</b> {booking?.skill || 'काम'} · {booking?.days || 1} दिन</span>
          <span><b>रेट:</b> ₹{booking?.agreed_rate || booking?.daily_rate || 0}/दिन</span>
        </div>

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundImage: 'radial-gradient(#d1d7db 0.75px, transparent 0.75px)',
            backgroundSize: '16px 16px'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: '13px', padding: '10px' }}>
              संदेश लोड हो रहे हैं…
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#666', background: '#fff', padding: '12px 18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '280px' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>💬</div>
              <b style={{ fontSize: '13px' }}>बातचीत शुरू करें</b>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                आप सीधे चैट पर समय, रेट और जगह की जानकारी साझा कर सकते हैं।
              </div>
            </div>
          )}

          {messages.map((m, idx) => {
            const isMe = m.mine;
            return (
              <div
                key={m.id || idx}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  background: isMe ? '#dcf8c6' : '#ffffff',
                  color: '#111',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '7px 10px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  position: 'relative',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: '1.35'
                }}
              >
                {!isMe && (
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '2px' }}>
                    {m.from}
                  </div>
                )}
                <div>{m.text}</div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#777',
                    textAlign: 'right',
                    marginTop: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '3px'
                  }}
                >
                  <span>{formatTime(m.at)}</span>
                  {isMe && <span style={{ color: '#4fc3f7', fontSize: '12px', lineHeight: 1 }}>✓✓</span>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* WhatsApp Style Message Input Bar */}
        <form
          onSubmit={handleSend}
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e0e0e0',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="संदेश लिखें (Type a message)…"
            style={{
              flex: 1,
              borderRadius: '24px',
              border: '1px solid #ccc',
              padding: '10px 16px',
              fontSize: '14px',
              outline: 'none',
              background: '#f9f9f9'
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: text.trim() ? '#2e7d32' : '#bdbdbd',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: text.trim() ? 'pointer' : 'default',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
            title="भेजें"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}

