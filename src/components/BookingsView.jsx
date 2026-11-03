import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { syncBooking } from '../firebase';

export default function BookingsView({ user, token, meta, lang, refreshTrigger, onOpenCounter, showToast, t }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startOtpInput, setStartOtpInput] = useState({});
  const [showOtpField, setShowOtpField] = useState({});
  const [ratings, setRatings] = useState({});

  const role = user?.role || 'worker';

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api('/bookings/mine', 'GET', null, token);
      setBookings(res.bookings || []);
    } catch (err) {
      showToast(err.message || "Failed to load bookings");
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
      showToast(err.message || "Status update failed");
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
      showToast("काम शुरू हो गया! 👍");
      loadBookings();
    } catch (err) {
      showToast(err.message || "Invalid OTP");
    }
  };

  const handleRate = async (bookingId, stars) => {
    try {
      await api(`/bookings/${bookingId}/rate`, 'POST', { rating: stars }, token);
      showToast(t('saved'));
      loadBookings();
    } catch (err) {
      showToast(err.message || "Rating failed");
    }
  };

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      <div className="card">
        <h2>📋 {t('bookings')}</h2>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
          <div>{t('nojobs')}</div>
        </div>
      )}

      {bookings.map((b) => {
        const otherName = role === 'worker' ? (b.customer_name || t('customerName')) : (b.worker_name || t('workerName'));
        const isWorker = role === 'worker';

        return (
          <div key={b.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '16px' }}>{getSkillLabel(b.skill)}</b>
              <span className={`pill ${b.status === 'completed' ? 'free' : b.status === 'rejected' || b.status === 'cancelled' ? 'busy' : 'offline'}`}>
                {t('st_' + b.status) || b.status}
              </span>
            </div>

            <div className="sub" style={{ margin: '4px 0' }}>
              👤 {otherName} · 📅 {b.start_date || '-'} · ⏱️ {b.days || 1} {t('days')}
            </div>

            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--g)', margin: '4px 0' }}>
              ₹{b.daily_rate || 0} / {t('daySfx') || 'दिन'}
            </div>

            {b.address && <div className="sub">📍 {b.address}</div>}
            {b.note && <div className="sub">📝 {b.note}</div>}

            {/* OTP display for customer */}
            {!isWorker && b.start_otp && (b.status === 'accepted' || b.status === 'requested') && (
              <div className="card" style={{ background: '#e8f5e9', border: '1px dashed #2e7d32', padding: '10px', margin: '8px 0' }}>
                <b style={{ color: 'var(--g)' }}>🔑 {t('otpLabel')}: {b.start_otp}</b>
                <div className="sub">{t('otpHint')}</div>
              </div>
            )}

            {/* Actions for worker */}
            {isWorker && b.status === 'requested' && (
              <div className="row" style={{ marginTop: '10px' }}>
                <button onClick={() => handleStatusChange(b.id, 'accepted')}>{t('accept')}</button>
                <button className="sec" onClick={() => onOpenCounter('bookings', b.id, loadBookings)}>{t('counter')}</button>
                <button className="warn" onClick={() => handleStatusChange(b.id, 'rejected')}>{t('reject')}</button>
              </div>
            )}

            {/* Start Work OTP verification for Worker */}
            {isWorker && b.status === 'accepted' && (
              <div style={{ marginTop: '10px' }}>
                {showOtpField[b.id] ? (
                  <div className="row">
                    <input
                      type="number"
                      placeholder="4 अंक का OTP"
                      value={startOtpInput[b.id] || ''}
                      onChange={(e) => setStartOtpInput({ ...startOtpInput, [b.id]: e.target.value })}
                    />
                    <button onClick={() => handleStartWork(b.id)}>सत्यापित करें</button>
                  </div>
                ) : (
                  <button className="big" style={{ background: '#1565c0' }} onClick={() => setShowOtpField({ ...showOtpField, [b.id]: true })}>
                    {t('startWork')}
                  </button>
                )}
              </div>
            )}

            {/* Complete action */}
            {(b.status === 'accepted' || b.status === 'started') && (
              <div className="row" style={{ marginTop: '10px' }}>
                <button style={{ background: '#2e7d32' }} onClick={() => handleStatusChange(b.id, 'completed')}>
                  ✔ {t('complete')}
                </button>
                {b.other_phone && (
                  <a href={`tel:${b.other_phone}`} style={{ textDecoration: 'none' }}>
                    <button type="button" className="sec">{t('call')}</button>
                  </a>
                )}
              </div>
            )}

            {/* Rating stars if completed and not rated */}
            {b.status === 'completed' && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                <div className="sub">{t('rateit')}:</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="sec"
                      style={{ padding: '6px 10px', fontSize: '18px' }}
                      onClick={() => handleRate(b.id, star)}
                    >
                      {star <= (b.rating || ratings[b.id] || 0) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

