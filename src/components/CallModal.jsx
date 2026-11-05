import React, { useState, useEffect, useRef } from 'react';

export default function CallModal({
  callTarget, // { name, phone, worker_id, customer_id, booking_id }
  incomingCall, // { from, caller, booking_id, target_user_id, offer }
  ws,
  meta,
  onClose,
  showToast,
  t
}) {
  const [phase, setPhase] = useState('choice'); // 'choice' | 'calling' | 'incoming' | 'connected'
  const [duration, setDuration] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const queuedCandidatesRef = useRef([]);
  const timerRef = useRef(null);

  const iceServers = meta?.ice_servers || [{ urls: ['stun:stun.l.google.com:19302'] }];

  // Send RTC signaling message over WebSocket
  const sendRtc = (data) => {
    if (!ws || ws.readyState !== 1) return;
    const bookingId = callTarget?.booking_id || incomingCall?.booking_id || null;
    const targetUserId = incomingCall ? incomingCall.from : (callTarget?.worker_id || callTarget?.customer_id || null);
    ws.send(JSON.stringify({
      type: 'rtc',
      booking_id: bookingId,
      target_user_id: targetUserId,
      data
    }));
  };

  const cleanupCall = () => {
    clearInterval(timerRef.current);
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(tr => tr.stop()); } catch (e) {}
      streamRef.current = null;
    }
    queuedCandidatesRef.current = [];
  };

  const handleHangup = () => {
    sendRtc({ kind: 'hangup' });
    cleanupCall();
    onClose();
    showToast(t('callended') || 'कॉल खत्म');
  };

  // Prepare WebRTC Peer Connection
  const preparePeer = async () => {
    cleanupCall();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    stream.getTracks().forEach(tr => pc.addTrack(tr, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendRtc({ kind: 'ice', candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setPhase('connected');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        handleHangup();
      }
    };

    return pc;
  };

  // Start outgoing in-app call
  const startInAppCall = async () => {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) {
      showToast(t('nomic') || 'माइक्रोफोन की अनुमति चाहिए');
      return;
    }
    if (!ws || ws.readyState !== 1) {
      showToast('आप ऑफलाइन हैं। फोन से कॉल करें।');
      return;
    }

    try {
      setPhase('calling');
      const pc = await preparePeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendRtc({ kind: 'offer', sdp: offer });
    } catch (err) {
      cleanupCall();
      showToast(err.message || 'कॉल शुरू नहीं हो सकी');
      setPhase('choice');
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    if (!incomingCall?.offer) return;
    try {
      const pc = await preparePeer();
      await pc.setRemoteDescription(incomingCall.offer);

      for (const candidate of queuedCandidatesRef.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      queuedCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendRtc({ kind: 'answer', sdp: answer });
      setPhase('connected');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      cleanupCall();
      showToast('कॉल नहीं उठ सकी: ' + err.message);
      onClose();
    }
  };

  const declineIncomingCall = () => {
    sendRtc({ kind: 'hangup' });
    cleanupCall();
    onClose();
  };

  // Watch for incoming call signals if call is initiated
  useEffect(() => {
    if (incomingCall) {
      setPhase('incoming');
    }
  }, [incomingCall]);

  // Handle external WebSocket signal events
  useEffect(() => {
    const handleSignal = (e) => {
      const { data } = e.detail || {};
      if (!data) return;
      if (data.kind === 'answer' && pcRef.current) {
        pcRef.current.setRemoteDescription(data.sdp).catch(() => {});
      } else if (data.kind === 'ice' && pcRef.current) {
        if (pcRef.current.remoteDescription) {
          pcRef.current.addIceCandidate(data.candidate).catch(() => {});
        } else {
          queuedCandidatesRef.current.push(data.candidate);
        }
      } else if (data.kind === 'hangup' || data.kind === 'busy') {
        cleanupCall();
        onClose();
        showToast(t('callended') || 'कॉल खत्म');
      }
    };

    window.addEventListener('mistri_rtc_signal', handleSignal);
    return () => {
      window.removeEventListener('mistri_rtc_signal', handleSignal);
      cleanupCall();
    };
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const displayName = incomingCall ? (incomingCall.caller?.name || 'ग्राहक / मिस्त्री') : (callTarget?.name || 'साथी');
  const targetPhone = callTarget?.phone || '';

  return (
    <div className="modal" id="callui">
      {/* Hidden audio element to play remote voice */}
      <audio ref={audioRef} autoPlay playsInline />

      <div className="sheet" style={{ textAlign: 'center', padding: '24px 18px', maxWidth: '420px' }}>
        {/* Choice Modal (User clicks Call) */}
        {phase === 'choice' && (
          <div>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>📞</div>
            <h2 style={{ margin: '4px 0 10px' }}>{displayName} को कॉल करें</h2>
            <div className="sub" style={{ marginBottom: '18px' }}>
              आप ऐप से सीधे फ्री वॉइस कॉल कर सकते हैं
            </div>

            <button
              type="button"
              className="big"
              style={{ background: '#2e7d32', marginBottom: '10px' }}
              onClick={startInAppCall}
            >
              🎧 {t('inapp') || 'ऐप से कॉल (फ्री)'}
            </button>

            {targetPhone && (
              <a href={`tel:${targetPhone}`} style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  className="big sec"
                  style={{ marginBottom: '10px' }}
                >
                  📱 {t('phonecall') || 'फोन डायलर से कॉल'}
                </button>
              </a>
            )}

            <button
              type="button"
              className="big sec"
              onClick={onClose}
            >
              ✖ {t('close') || 'रद्द करें'}
            </button>
          </div>
        )}

        {/* Outgoing Calling Screen */}
        {phase === 'calling' && (
          <div>
            <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite', margin: '10px 0' }}>
              📲
            </div>
            <h2 style={{ margin: '6px 0 4px' }}>{displayName}</h2>
            <div className="sub" style={{ fontSize: '15px', color: 'var(--g)' }}>
              {t('calling') || 'कॉल लग रही है…'}
            </div>

            <div style={{ marginTop: '28px' }}>
              <button
                type="button"
                className="big warn"
                style={{ borderRadius: '50px', padding: '14px' }}
                onClick={handleHangup}
              >
                🛑 {t('hangup') || 'काटें'}
              </button>
            </div>
          </div>
        )}

        {/* Incoming Call Screen */}
        {phase === 'incoming' && (
          <div>
            <div style={{ fontSize: '48px', animation: 'bounce 1s infinite', margin: '10px 0' }}>
              📞
            </div>
            <div className="sub" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('incoming') || 'इनकमिंग कॉल'}
            </div>
            <h2 style={{ margin: '6px 0 16px', fontSize: '22px' }}>{displayName}</h2>

            <div className="row" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="big"
                style={{ background: '#2e7d32' }}
                onClick={answerCall}
              >
                ✔ {t('answer') || 'उठाएँ'}
              </button>
              <button
                type="button"
                className="big warn"
                onClick={declineIncomingCall}
              >
                ✖ {t('reject') || 'काटें'}
              </button>
            </div>
          </div>
        )}

        {/* Call Connected Screen */}
        {phase === 'connected' && (
          <div>
            <div style={{ fontSize: '46px', margin: '10px 0' }}>
              🎧
            </div>
            <h2 style={{ margin: '4px 0 2px' }}>{displayName}</h2>
            <div className="pill free" style={{ margin: '6px 0' }}>
              {t('connected') || 'कॉल चालू है'}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '14px 0' }}>
              ⏱️ {formatTimer(duration)}
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="big warn"
                style={{ borderRadius: '50px', padding: '14px' }}
                onClick={handleHangup}
              >
                🛑 {t('hangup') || 'काटें'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
