import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';
import { syncWorkerProfile } from '../firebase';

export default function WorkerToday({ user, profile, token, onUpdateProfile, showToast, t }) {
  const [hours, setHours] = useState(8);
  const [invites, setInvites] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);

  const status = profile?.status || 'free';

  const loadData = async () => {
    try {
      const [invRes, earnRes] = await Promise.all([
        api('/worker/invites', 'GET', null, token).catch(() => ({ invites: [] })),
        api('/worker/earnings', 'GET', null, token).catch(() => null)
      ]);
      setInvites(invRes.invites || []);
      if (earnRes) setEarnings(earnRes);
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
      showToast(t('saved'));
    } catch (err) {
      showToast(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      showToast("📍 लोकेशन ले रहे हैं...");
      const loc = await getLoc(true);
      await api('/worker/location', 'POST', { lat: loc.lat, lng: loc.lng }, token);
      const updatedProfile = { ...profile, lat: loc.lat, lng: loc.lng };
      onUpdateProfile(updatedProfile);
      syncWorkerProfile(user.id, updatedProfile);
      showToast(t('locok') || "लोकेशन अपडेट हो गई!");
    } catch (err) {
      showToast(err.message || "Location error");
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      await api(`/worker/invites/${inviteId}/respond`, 'POST', { accept }, token);
      showToast(t('saved'));
      loadData();
    } catch (err) {
      showToast(err.message || "Error responding to invite");
    }
  };

  return (
    <div>
      {/* Contractor Invitations */}
      {invites.map((inv) => (
        <div key={inv.id} className="card" style={{ borderLeft: '5px solid var(--o)' }}>
          <b>👥 {t('invitesTitle')}</b>: {inv.company || inv.contractor}
          <div className="sub">₹{inv.daily_rate || '-'}/{t('daySfx') || 'दिन'}</div>
          <div className="row" style={{ marginTop: '8px' }}>
            <button onClick={() => handleInviteResponse(inv.id, true)}>{t('join')}</button>
            <button className="warn" onClick={() => handleInviteResponse(inv.id, false)}>{t('decline')}</button>
          </div>
        </div>
      ))}

      {/* Today Status Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('today')}</h2>
          <span className={`pill ${status === 'free' ? 'free' : status === 'busy' ? 'busy' : 'offline'}`}>
            {t('s_' + status)}
          </span>
        </div>

        {profile?.lat == null && (
          <div className="sub" style={{ color: 'var(--red)', margin: '6px 0' }}>
            ⚠️ {t('profilefirst')}
          </div>
        )}

        <label>{t('hours')}</label>
        <select value={hours} onChange={(e) => setHours(e.target.value)}>
          {[2, 4, 6, 8, 10, 12].map((h) => (
            <option key={h} value={h}>{h} {t('hoursLeft') || 'घंटे'}</option>
          ))}
        </select>

        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="big"
            style={{ background: '#2e7d32' }}
            onClick={() => setStatus('free')}
            disabled={loading}
          >
            {t('freeToday')}
          </button>
          <div className="row">
            <button
              type="button"
              className="warn"
              onClick={() => setStatus('busy')}
              disabled={loading}
            >
              {t('busy')}
            </button>
            <button
              type="button"
              className="sec"
              onClick={() => setStatus('offline')}
              disabled={loading}
            >
              {t('offline')}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '14px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <button className="sec" style={{ width: '100%' }} onClick={handleUpdateLocation}>
            📍 {t('setloc')} {profile?.lat != null ? '✔' : ''}
          </button>
        </div>
      </div>

      {/* Earnings Summary Card */}
      <div className="card">
        <h3>💰 {t('earnings')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <div className="stat">
            <b>{earnings?.jobs_done ?? profile?.jobs_done ?? 0}</b>
            <span className="sub">{t('jobsDone')}</span>
          </div>
          <div className="stat">
            <b>₹{(earnings?.total_earned ?? 0).toLocaleString('en-IN')}</b>
            <span className="sub">{t('totalEarned')}</span>
          </div>
          <div className="stat">
            <b>₹{(earnings?.this_month ?? 0).toLocaleString('en-IN')}</b>
            <span className="sub">{t('thisMonth')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

