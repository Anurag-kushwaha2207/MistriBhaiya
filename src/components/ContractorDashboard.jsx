import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorDashboard({ user, profile, token, onOpenProfile, showToast, t }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/dashboard', 'GET', null, token);
      setStats(res);
    } catch (err) {
      showToast(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const fmtINR = (n) => "₹" + (n || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{profile?.company || user?.name || t('contractor')}</h2>
          <button className="sec" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={onOpenProfile}>
            ✏️ {t('editProfile')}
          </button>
        </div>
        {profile?.lat == null && (
          <div className="sub" style={{ color: 'var(--red)', marginTop: '4px' }}>
            ⚠️ {t('profilefirst')}
          </div>
        )}
      </div>

      <div className="card">
        <h3>📊 {t('cdash')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <div className="stat">
            <b>{stats?.crew_active ?? 0}</b>
            <span className="sub">{t('crewActive')}</span>
          </div>
          <div className="stat">
            <b>{stats?.crew_invited ?? 0}</b>
            <span className="sub">{t('crewInvited')}</span>
          </div>
          <div className="stat">
            <b>{stats?.new_requests ?? 0}</b>
            <span className="sub">{t('newRequests')}</span>
          </div>
          <div className="stat">
            <b>{stats?.active_projects ?? 0}</b>
            <span className="sub">{t('activeProjects')}</span>
          </div>
          <div className="stat">
            <b>{stats?.completed_projects ?? 0}</b>
            <span className="sub">{t('doneProjects')}</span>
          </div>
          <div className="stat">
            <b>{fmtINR(stats?.business_value)}</b>
            <span className="sub">{t('businessValue')}</span>
          </div>
          <div className="stat">
            <b>{fmtINR(stats?.wages_due)}</b>
            <span className="sub">{t('wagesDue')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

