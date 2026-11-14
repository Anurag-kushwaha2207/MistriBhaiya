import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';
import { syncWorkerProfile } from '../firebase';

export default function WorkerToday({ user, profile, token, onUpdateProfile, showToast, lang = 'hi', t }) {
  const [hours, setHours] = useState(8);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);

  const status = profile?.status || 'offline';
  const isEn = lang === 'en';

  const loadData = async () => {
    try {
      const invRes = await api('/worker/invites', 'GET', null, token).catch(() => ({ invites: [] }));
      setInvites(invRes.invites || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const setStatus = async (newStatus) => {
    setLoading(true);
    try {
      let loc = null;
      try {
        loc = await getLoc(false);
      } catch (e) {}

      const payload = {
        status: newStatus,
        hours_free: newStatus === 'free' ? parseInt(hours, 10) : 0,
        ...(loc ? { lat: loc.lat, lng: loc.lng } : {})
      };
      const res = await api('/worker/status', 'POST', payload, token);
      const updatedProfile = { ...profile, ...res.profile, status: newStatus };
      onUpdateProfile(updatedProfile);
      syncWorkerProfile(user.id, updatedProfile);
      if (newStatus === 'free') {
        showToast(isEn ? '🟡 You are now Free (Yellow) & visible to customers!' : '🟡 आप अब फ्री (पीला) हैं और ग्राहकों को दिखेंगे!');
      } else {
        showToast(t('saved'));
      }
    } catch (err) {
      showToast(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      showToast(isEn ? "📍 Getting live GPS location..." : "📍 लोकेशन ले रहे हैं...");
      const loc = await getLoc(true);
      await api('/worker/location', 'POST', { lat: loc.lat, lng: loc.lng }, token);
      const updatedProfile = { ...profile, lat: loc.lat, lng: loc.lng };
      onUpdateProfile(updatedProfile);
      syncWorkerProfile(user.id, updatedProfile);
      showToast(t('locok') || (isEn ? "Location updated!" : "लोकेशन अपडेट हो गई!"));
    } catch (err) {
      showToast(err.message || "Location error");
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      await api(`/worker/invites/${inviteId}/respond`, 'POST', { accept }, token);
      showToast(accept ? (isEn ? "Joined contractor crew!" : "ठेकेदार के साथ जुड़ गए!") : t('saved'));
      loadData();
    } catch (err) {
      showToast(err.message || "Error responding to invite");
    }
  };

  return (
    <div>
      {/* Contractor Invitations */}
      {invites.map((inv) => (
        <div key={inv.id} className="card" style={{ borderLeft: '5px solid var(--o)', marginBottom: '12px' }}>
          <b>👥 {t('invitesTitle') || (isEn ? 'Contractor Invite' : 'ठेकेदार से न्योता')}</b>: <b>{inv.company || inv.contractor}</b>
          <div className="sub" style={{ margin: '4px 0' }}>
            दैनिक दर: <b>₹{inv.daily_rate || '-'}/{t('daySfx') || (isEn ? 'day' : 'दिन')}</b>
          </div>
          <div className="row" style={{ marginTop: '8px' }}>
            <button
              style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold' }}
              onClick={() => handleInviteResponse(inv.id, true)}
            >
              ✔ {t('join') || (isEn ? 'Accept & Join' : 'स्वीकार करें')}
            </button>
            <button
              className="warn"
              onClick={() => handleInviteResponse(inv.id, false)}
            >
              ✖ {t('decline') || (isEn ? 'Decline' : 'मना करें')}
            </button>
          </div>
        </div>
      ))}

      {/* Today Status Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{t('today')}</h2>
          <span
            className="pill"
            style={
              status === 'free'
                ? {
                    background: '#fbc02d',
                    color: '#000',
                    fontWeight: 'bold',
                    border: '1.5px solid #f57f17',
                    padding: '4px 10px'
                  }
                : status === 'busy'
                ? { background: '#d32f2f', color: '#fff' }
                : { background: '#9e9e9e', color: '#fff' }
            }
          >
            {status === 'free' ? (isEn ? '🟡 Free' : '🟡 फ्री (उपलब्ध)') : t('s_' + status)}
          </span>
        </div>

        {profile?.lat == null && (
          <div className="sub" style={{ color: 'var(--red)', margin: '8px 0', fontWeight: 'bold' }}>
            ⚠️ {t('profilefirst')}
          </div>
        )}

        <label style={{ marginTop: '12px', display: 'block', fontWeight: 'bold', fontSize: '13px' }}>
          {t('hours')}
        </label>
        <select value={hours} onChange={(e) => setHours(e.target.value)} style={{ marginBottom: '12px' }}>
          {[2, 4, 6, 8, 10, 12].map((h) => (
            <option key={h} value={h}>
              {h} {t('hoursLeft') || (isEn ? 'hours free' : 'घंटे')}
            </option>
          ))}
        </select>

        {/* Visibility Status Info Banner */}
        <div style={{ marginBottom: '12px' }}>
          {status === 'free' ? (
            <div
              style={{
                background: '#fffde7',
                border: '1.5px solid #fbc02d',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '12px',
                color: '#7f6000',
                lineHeight: '1.5'
              }}
            >
              <b>🟡 {isEn ? 'You are marked FREE (Yellow)!' : 'आप फ्री (पीला) सेट हैं!'}</b>
              <br />
              {isEn
                ? 'Your ID is now VISIBLE to customers and contractors. They can search and book you.'
                : 'आपकी ID अब ग्राहकों और ठेकेदारों को दिख रही है। वे आपको खोज कर काम के लिए बुक कर सकते हैं।'}
            </div>
          ) : (
            <div
              style={{
                background: '#f5f5f5',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.5'
              }}
            >
              <b>⚪ {isEn ? 'You are currently not marked Free.' : 'आप अभी फ्री नहीं हैं।'}</b>
              <br />
              {isEn
                ? 'Your ID is HIDDEN from customers until you click "I am free today".'
                : 'जब तक आप "मैं आज फ्री हूँ" पर क्लिक नहीं करेंगे, आपकी ID ग्राहकों को नहीं दिखेगी।'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="big"
            style={
              status === 'free'
                ? {
                    background: '#fbc02d',
                    color: '#000',
                    fontWeight: 'bold',
                    border: '2px solid #f57f17',
                    boxShadow: '0 4px 12px rgba(251, 192, 45, 0.45)',
                    fontSize: '16px',
                    padding: '14px'
                  }
                : {
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1.5px solid #bbb',
                    fontSize: '15px',
                    padding: '12px'
                  }
            }
            onClick={() => setStatus('free')}
            disabled={loading}
          >
            {status === 'free'
              ? `✔ ${t('freeToday') || (isEn ? 'I am free today' : 'मैं आज फ्री हूँ')} (Yellow)`
              : `🔘 ${t('freeToday') || (isEn ? 'I am free today' : 'मैं आज फ्री हूँ')}`}
          </button>

          <div className="row">
            <button
              type="button"
              className="warn"
              style={{ padding: '10px' }}
              onClick={() => setStatus('busy')}
              disabled={loading}
            >
              ⛔ {t('busy') || (isEn ? 'I am busy' : 'काम पर हूँ (Busy)')}
            </button>
            <button
              type="button"
              className="sec"
              style={{ padding: '10px' }}
              onClick={() => setStatus('offline')}
              disabled={loading}
            >
              😴 {t('offline') || (isEn ? 'Not working today' : 'आज छुट्टी (Offline)')}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '14px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <button className="sec" style={{ width: '100%', padding: '10px' }} onClick={handleUpdateLocation}>
            📍 {t('setloc')} {profile?.lat != null ? '✔' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
