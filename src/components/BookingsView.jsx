import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { syncBooking } from '../firebase';

export default function BookingsView({
  user,
  token,
  meta,
  lang,
  refreshTrigger,
  onOpenCounter,
  onStartCall,
  onOpenChat,
  showToast,
  t
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startOtpInput, setStartOtpInput] = useState({});
  const [showOtpField, setShowOtpField] = useState({});
  const [ratings, setRatings] = useState({});

  const role = user?.role || 'worker';
  const isWorker = role === 'worker';

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api('/bookings/mine', 'GET', null, token);
      setBookings(res.bookings || []);
    } catch (err) {
      showToast(err.message || 'बुकिंग लोड करने में समस्या');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [token, refreshTrigger]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      if (newStatus === 'accepted') {
        await api(`/bookings/${bookingId}/respond`, 'POST', { accept: true }, token);
      } else if (newStatus === 'rejected') {
        await api(`/bookings/${bookingId}/respond`, 'POST', { accept: false }, token);
      } else if (newStatus === 'completed') {
        await api(`/bookings/${bookingId}/complete`, 'POST', null, token);
      } else {
        await api(`/bookings/${bookingId}/status`, 'POST', { status: newStatus }, token);
      }
      showToast(t('saved'));
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Status update failed');
    }
  };

  const handleAcceptOffer = async (bookingId) => {
    try {
      await api(`/bookings/${bookingId}/accept`, 'POST', null, token);
      showToast('ऑफर मंज़ूर हो गया! ✔');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'स्वीकार करने में विफल');
    }
  };

  const handleRejectOffer = async (bookingId) => {
    try {
      await api(`/bookings/${bookingId}/reject`, 'POST', null, token);
      showToast('बुकिंग रद्द की गई');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'रद्द करने में विफल');
    }
  };

  const handleStartWork = async (bookingId) => {
    const otp = startOtpInput[bookingId];
    if (!otp) {
      showToast(t('enterOtp'));
      return;
    }
    try {
      const res = await api(`/bookings/${bookingId}/start`, 'POST', { otp: otp.trim() }, token);
      syncBooking(res.booking);
      showToast('काम शुरू हो गया! 👍');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'गलत OTP');
    }
  };

  const handleRate = async (bookingId, stars) => {
    try {
      await api(`/bookings/${bookingId}/rate`, 'POST', { rating: stars }, token);
      setRatings(prev => ({ ...prev, [bookingId]: stars }));
      showToast(t('saved'));
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Rating failed');
    }
  };

  const triggerCall = (b) => {
    const targetUserId = isWorker ? b.customer_id : b.worker_id;
    const targetName = b.other_name || (isWorker ? b.customer_name : b.worker_name) || 'साथी';
    const targetPhone = b.other_phone || (isWorker ? b.customer_phone : b.worker_phone) || '';

    if (onStartCall) {
      onStartCall({
        name: targetName,
        phone: targetPhone,
        booking_id: b.id,
        target_user_id: targetUserId
      });
    } else if (targetPhone) {
      window.location.href = `tel:${targetPhone}`;
    } else {
      showToast('फोन नंबर उपलब्ध नहीं है');
    }
  };

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📋 {t('bookings')}</h2>
        <button className="sec" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={loadBookings}>
          🔄 रीफ्रेश
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>📋</div>
          <b style={{ fontSize: '16px' }}>{t('nojobs')}</b>
          <div className="sub" style={{ marginTop: '4px' }}>
            {isWorker ? 'जब कोई ग्राहक आपको बुक करेगा, वह यहाँ दिखेगा।' : 'मिस्त्री खोजें और सीधे काम के लिए बुक करें।'}
          </div>
        </div>
      )}

      {bookings.map((b) => {
        const otherName = b.other_name || (isWorker ? (b.customer_name || t('customerName')) : (b.worker_name || t('workerName')));
        const currentRate = b.agreed_rate || b.daily_rate || 0;
        const isMyOffer = b.offer_by === user?.id;

        return (
          <div key={b.id} className="card" style={{ borderLeft: '4px solid #2e7d32', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '17px', color: '#1b5e20' }}>{getSkillLabel(b.skill)}</b>
              <span className={`pill ${b.status === 'completed' ? 'free' : b.status === 'rejected' || b.status === 'cancelled' ? 'busy' : 'offline'}`}>
                {t('st_' + b.status) || b.status}
              </span>
            </div>

            <div className="sub" style={{ margin: '6px 0 4px', fontSize: '13px' }}>
              👤 <b>{otherName}</b> · 📅 {b.start_date || '-'} · ⏱️ {b.days || 1} {t('days')}
            </div>

            {/* Agreed Rate / Counter Rate Display */}
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32', margin: '4px 0 6px' }}>
              ₹{currentRate} / {t('daySfx') || 'दिन'}
            </div>

            {b.address && <div className="sub" style={{ fontSize: '12px' }}>📍 {b.address}</div>}
            {b.note && <div className="sub" style={{ fontSize: '12px', fontStyle: 'italic' }}>📝 "{b.note}"</div>}

            {/* OTP display for customer once accepted */}
            {!isWorker && b.start_otp && (b.status === 'accepted' || b.status === 'requested') && (
              <div style={{ background: '#e8f5e9', border: '1px dashed #2e7d32', borderRadius: '8px', padding: '10px 12px', margin: '10px 0' }}>
                <b style={{ color: '#2e7d32', fontSize: '15px' }}>🔑 काम शुरू करने का OTP: {b.start_otp}</b>
                <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                  मिस्त्री को काम शुरू करते समय यह 4-अंकों का OTP बताएं।
                </div>
              </div>
            )}

            {/* CASE 1: STATUS REQUESTED (Negotiation / Pending) */}
            {b.status === 'requested' && (
              <div style={{ marginTop: '12px' }}>
                {isMyOffer ? (
                  <div>
                    <div style={{ fontSize: '12px', color: '#555', background: '#fff9c4', padding: '7px 10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fff176' }}>
                      ⏳ <b>{isWorker ? 'ग्राहक' : 'मिस्त्री'} के जवाब का इंतज़ार है</b> (आपने ₹{currentRate} भेजा है)
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        className="sec"
                        style={{ flex: 1, minWidth: '90px', fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => onOpenCounter('bookings', b.id, loadBookings)}
                      >
                        ↔ रेट बदलें
                      </button>
                      <button
                        className="warn"
                        style={{ flex: 1, minWidth: '80px', fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => handleRejectOffer(b.id)}
                      >
                        ✖ रद्द करें
                      </button>
                      {onOpenChat && (
                        <button
                          type="button"
                          className="sec"
                          style={{ background: '#e8f5e9', borderColor: '#2e7d32', color: '#1b5e20', fontWeight: 'bold', fontSize: '13px', padding: '7px 12px' }}
                          onClick={() => onOpenChat(b)}
                        >
                          💬 चैट
                        </button>
                      )}
                      <button
                        type="button"
                        className="sec"
                        style={{ fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => triggerCall(b)}
                      >
                        📞 कॉल
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: '#1b5e20', background: '#e8f5e9', padding: '7px 10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #c8e6c9' }}>
                      🔔 <b>नया ऑफर आया है: ₹{currentRate} / दिन</b>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        style={{ flex: 1, minWidth: '110px', background: '#2e7d32', fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => handleAcceptOffer(b.id)}
                      >
                        ✔ मंज़ूर (₹{currentRate})
                      </button>
                      <button
                        className="sec"
                        style={{ flex: 1, minWidth: '90px', fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => onOpenCounter('bookings', b.id, loadBookings)}
                      >
                        ↔ कम-ज़्यादा
                      </button>
                      <button
                        className="warn"
                        style={{ flex: 1, minWidth: '70px', fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => handleRejectOffer(b.id)}
                      >
                        ✖ मना
                      </button>
                      {onOpenChat && (
                        <button
                          type="button"
                          className="sec"
                          style={{ background: '#e8f5e9', borderColor: '#2e7d32', color: '#1b5e20', fontWeight: 'bold', fontSize: '13px', padding: '7px 12px' }}
                          onClick={() => onOpenChat(b)}
                        >
                          💬 चैट
                        </button>
                      )}
                      <button
                        type="button"
                        className="sec"
                        style={{ fontSize: '13px', padding: '7px 10px' }}
                        onClick={() => triggerCall(b)}
                      >
                        📞 कॉल
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CASE 2: STATUS ACCEPTED */}
            {b.status === 'accepted' && (
              <div style={{ marginTop: '12px' }}>
                {isWorker && (
                  <div style={{ marginBottom: '10px' }}>
                    {showOtpField[b.id] ? (
                      <div className="row" style={{ gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="ग्राहक से 4-अंक OTP लें"
                          value={startOtpInput[b.id] || ''}
                          onChange={(e) => setStartOtpInput({ ...startOtpInput, [b.id]: e.target.value })}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <button onClick={() => handleStartWork(b.id)} style={{ background: '#1565c0' }}>
                          सत्यापित करें
                        </button>
                      </div>
                    ) : (
                      <button
                        className="big"
                        style={{ background: '#1565c0', marginBottom: '8px' }}
                        onClick={() => setShowOtpField({ ...showOtpField, [b.id]: true })}
                      >
                        ▶️ {t('startWork')} (OTP दर्ज करें)
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    style={{ background: '#2e7d32', flex: 1, minWidth: '100px', fontSize: '13px', padding: '7px 10px' }}
                    onClick={() => handleStatusChange(b.id, 'completed')}
                  >
                    ✔ {t('complete')}
                  </button>
                  {onOpenChat && (
                    <button
                      type="button"
                      className="sec"
                      style={{ background: '#e8f5e9', borderColor: '#2e7d32', color: '#1b5e20', fontWeight: 'bold', fontSize: '13px', padding: '7px 12px' }}
                      onClick={() => onOpenChat(b)}
                    >
                      💬 चैट
                    </button>
                  )}
                  <button
                    type="button"
                    className="sec"
                    style={{ fontSize: '13px', padding: '7px 10px' }}
                    onClick={() => triggerCall(b)}
                  >
                    📞 कॉल
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: STATUS STARTED */}
            {b.status === 'started' && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#1565c0', background: '#e3f2fd', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                  🔨 <b>कार्य प्रारंभ हो चुका है (चालू)</b>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    style={{ background: '#2e7d32', flex: 1, minWidth: '100px', fontSize: '13px', padding: '7px 10px' }}
                    onClick={() => handleStatusChange(b.id, 'completed')}
                  >
                    ✔ {t('complete')}
                  </button>
                  {onOpenChat && (
                    <button
                      type="button"
                      className="sec"
                      style={{ background: '#e8f5e9', borderColor: '#2e7d32', color: '#1b5e20', fontWeight: 'bold', fontSize: '13px', padding: '7px 12px' }}
                      onClick={() => onOpenChat(b)}
                    >
                      💬 चैट
                    </button>
                  )}
                  <button
                    type="button"
                    className="sec"
                    style={{ fontSize: '13px', padding: '7px 10px' }}
                    onClick={() => triggerCall(b)}
                  >
                    📞 कॉल
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: STATUS COMPLETED */}
            {b.status === 'completed' && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="sub" style={{ fontSize: '12px' }}>{t('rateit')}:</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="sec"
                        style={{ padding: '3px 7px', fontSize: '15px' }}
                        onClick={() => handleRate(b.id, star)}
                      >
                        {star <= (b.rating || ratings[b.id] || 0) ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                {onOpenChat && (
                  <button
                    type="button"
                    className="sec"
                    style={{ background: '#e8f5e9', borderColor: '#2e7d32', color: '#1b5e20', fontWeight: 'bold', fontSize: '12px', padding: '5px 12px' }}
                    onClick={() => onOpenChat(b)}
                  >
                    💬 चैट
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
