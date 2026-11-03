import React, { useState, useEffect, useRef } from 'react';
import { api, getLoc } from '../api';
import { BOT_LANGS, BOT_VOICE } from '../translations';

export default function AssistantView({ token, lang, onNavigateTab, showToast, t }) {
  const [botLang, setBotLang] = useState(localStorage.getItem('ks_botlang') || (lang === 'en' ? 'en' : 'hi'));
  const [messages, setMessages] = useState([]);
  const [chips, setChips] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(localStorage.getItem('ks_speak') !== '0');
  const [busy, setBusy] = useState(false);

  const boxRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initial welcome message if empty
    if (messages.length === 0) {
      callAssistant({ text: "नमस्ते", location: null });
    }
  }, []);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  const speakText = (text) => {
    if (!speakReplies || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[•\n]+/g, '. '));
      u.lang = BOT_VOICE[botLang] || 'hi-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  const callAssistant = async (body) => {
    setBusy(true);
    try {
      const res = await api('/assistant', 'POST', { ...body, lang: botLang }, token);
      if (res.lang) {
        setBotLang(res.lang);
        localStorage.setItem('ks_botlang', res.lang);
      }
      if (res.reply) {
        setMessages((prev) => [...prev, { me: false, text: res.reply }]);
        speakText(res.reply);
      }
      setChips(res.chips || []);

      for (const action of res.actions || []) {
        if (action.type === 'request_location') {
          try {
            const loc = await getLoc(true);
            setMessages((prev) => [...prev, { me: true, text: '📍 लोकेशन भेजी' }]);
            await callAssistant({ text: '', location: loc });
          } catch (e) {
            setMessages((prev) => [...prev, { me: false, text: '⚠️ ' + e.message }]);
          }
        } else if (action.type === 'navigate' && onNavigateTab) {
          setTimeout(() => onNavigateTab(action.tab), 1200);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { me: false, text: '⚠️ ' + (err.message || "Error") }]);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = (textToSend) => {
    const txt = (textToSend || inputText).trim();
    if (!txt) return;
    setMessages((prev) => [...prev, { me: true, text: txt }]);
    setInputText('');
    callAssistant({ text: txt });
  };

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(t('botNoMic'));
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = BOT_VOICE[botLang] || 'hi-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        showToast(t('botListen'));
      };

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          handleSend(transcript);
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      setIsListening(false);
      showToast(t('nomic'));
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🤖 {t('botTitle')}</h2>
        <select
          value={botLang}
          onChange={(e) => {
            setBotLang(e.target.value);
            localStorage.setItem('ks_botlang', e.target.value);
          }}
          style={{ width: 'auto', padding: '6px' }}
        >
          {BOT_LANGS.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ margin: '6px 0', fontSize: '12px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={speakReplies}
            onChange={(e) => {
              setSpeakReplies(e.target.checked);
              localStorage.setItem('ks_speak', e.target.checked ? '1' : '0');
            }}
          />
          🔊 {t('botSpeak')}
        </label>
      </div>

      {/* Messages Box */}
      <div ref={boxRef} className="botbox">
        {messages.map((m, idx) => (
          <div key={idx} className={`bubble ${m.me ? 'me' : 'ot'}`}>
            {m.text.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < m.text.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        ))}
        {busy && <div className="bubble ot">…</div>}
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((chip, idx) => (
            <button key={idx} onClick={() => handleSend(chip.text || chip.label)}>
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="row" style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={t('botType')}
        />
        <button
          type="button"
          className={`mic ${isListening ? 'on' : ''}`}
          style={{ flex: 'none', width: '50px', padding: '12px 0', fontSize: '18px' }}
          onClick={toggleMic}
        >
          🎤
        </button>
        <button
          type="button"
          style={{ flex: 'none', width: '56px', padding: '12px 0' }}
          onClick={() => handleSend()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

