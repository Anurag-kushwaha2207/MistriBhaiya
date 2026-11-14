import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorDashboard({ user, profile, token, onOpenProfile, showToast, t }) {
  const [stats, setStats] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, projRes] = await Promise.all([
        api('/contractor/dashboard', 'GET', null, token).catch(() => null),
        api('/contractor/projects', 'GET', null, token).catch(() => ({ projects: [] }))
      ]);
      if (dashRes) setStats(dashRes);
      const allP = projRes?.projects || [];
      setIncomingRequests(allP.filter(p => p.status === 'requested'));
      setActiveProjects(allP.filter(p => p.status === 'accepted' || p.status === 'in_progress'));
    } catch (err) {
      showToast(err.message || "डैशबोर्ड लोड करने में विफल");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const handleAccept = async (pid) => {
    setActionBusy(pid);
    try {
      await api(`/contractor/projects/${pid}/status`, 'POST', { status: 'accepted' }, token);
      showToast("🎉 प्रोजेक्ट अनुरोध स्वीकार कर लिया गया!");
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "स्वीकार करने में विफल");
    } finally {
      setActionBusy(null);
    }
  };

  const handleReject = async (pid) => {
    if (!window.confirm("क्या आप इस प्रोजेक्ट को अस्वीकार करना चाहते हैं?")) return;
    setActionBusy(pid);
    try {
      await api(`/contractor/projects/${pid}/status`, 'POST', { status: 'rejected' }, token);
      showToast("प्रोजेक्ट अस्वीकार किया गया");
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "अस्वीकार करने में विफल");
    } finally {
      setActionBusy(null);
    }
  };

  const fmtINR = (n) => "₹" + (n || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>{profile?.company || user?.name || t('contractor') || 'ठेकेदार'}</h2>
            <div className="sub" style={{ marginTop: '2px' }}>🏗️ ठेकेदार प्रोफ़ाइल · 📱 {user?.phone || ''}</div>
          </div>
          <button className="sec" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={onOpenProfile}>
            ✏️ {t('editProfile') || 'प्रोफ़ाइल बदलें'}
          </button>
        </div>
        {profile?.lat == null && (
          <div className="sub" style={{ color: 'var(--red)', marginTop: '8px', fontWeight: 'bold' }}>
            ⚠️ कृपया प्रोफ़ाइल में जाकर अपनी लोकेशन (राज्य/जिला/तहसील) सेट करें ताकि ग्राहक आपको ढूंढ सकें!
          </div>
        )}
      </div>

      {/* Incoming Requests Alert Section */}
      {incomingRequests.length > 0 && (
        <div
          className="card"
          style={{
            background: '#fff9e6',
            border: '2px solid #ffb74d',
            boxShadow: '0 4px 12px rgba(255,152,0,0.15)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, color: '#e65100', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔔</span> नए ग्राहक अनुरोध ({incomingRequests.length})
            </h3>
            <span className="pill" style={{ background: '#e65100', color: '#fff', fontSize: '11px' }}>Action Required</span>
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px' }}>
            ग्राहकों ने आपके पास काम के नए प्रोजेक्ट भेजे हैं। तुरंत स्वीकार करें या अस्वीकार करें:
          </p>

          {incomingRequests.map((req) => (
            <div
              key={req.id}
              style={{
                background: '#fff',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ffe082',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <b style={{ fontSize: '16px', color: '#222' }}>{req.title}</b>
                  <div className="sub" style={{ fontSize: '12px', margin: '2px 0' }}>
                    👤 ग्राहक: <b>{req.customer_name || 'Customer'}</b> · ⏱️ {req.days || 1} दिन · 👥 {req.workers_needed || 1} कारीगर
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--g)' }}>
                  {fmtINR(req.total_budget || req.budget)}
                </div>
              </div>

              {req.address && (
                <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                  📍 साइट: {req.address}
                </div>
              )}

              {req.description && (
                <div style={{ fontSize: '12px', color: '#444', background: '#f8f8f8', padding: '6px 8px', borderRadius: '4px', margin: '6px 0' }}>
                  {req.description}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold', flex: 1, padding: '8px' }}
                  onClick={() => handleAccept(req.id)}
                  disabled={actionBusy === req.id}
                >
                  ✅ तुरंत स्वीकार करें
                </button>
                <button
                  className="warn"
                  style={{ fontSize: '12px', padding: '8px 14px' }}
                  onClick={() => handleReject(req.id)}
                  disabled={actionBusy === req.id}
                >
                  ❌ मना करें
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="card">
        <h3 style={{ margin: '0 0 10px' }}>📊 {t('cdash') || 'व्यापार सारांश'}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <div className="stat">
            <b>{incomingRequests.length}</b>
            <span className="sub">{t('newRequests') || 'नए अनुरोध'}</span>
          </div>
          <div className="stat">
            <b>{activeProjects.length}</b>
            <span className="sub">{t('activeProjects') || 'चालू प्रोजेक्ट्स'}</span>
          </div>
          <div className="stat">
            <b>{stats?.crew_active ?? 0}</b>
            <span className="sub">{t('crewActive') || 'सक्रिय साथी'}</span>
          </div>
          <div className="stat">
            <b>{stats?.completed_projects ?? 0}</b>
            <span className="sub">{t('doneProjects') || 'पूरे प्रोजेक्ट्स'}</span>
          </div>
          <div className="stat">
            <b>{fmtINR(stats?.business_value)}</b>
            <span className="sub">{t('businessValue') || 'कुल व्यापार'}</span>
          </div>
          <div className="stat">
            <b>{fmtINR(stats?.wages_due)}</b>
            <span className="sub">{t('wagesDue') || 'देय मज़दूरी'}</span>
          </div>
        </div>
      </div>

      {/* Active Work In-Progress Section */}
      {activeProjects.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 10px', color: '#2e7d32' }}>🏗️ वर्तमान में चालू प्रोजेक्ट्स ({activeProjects.length})</h3>
          {activeProjects.map((p) => (
            <div
              key={p.id}
              style={{
                borderBottom: '1px solid #eee',
                paddingBottom: '8px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <b>{p.title}</b>
                <div className="sub" style={{ fontSize: '12px' }}>
                  👤 {p.customer_name} · 👥 {p.crew_assigned || 0} साथी लगे हैं
                </div>
              </div>
              <span className="pill" style={{ background: p.status === 'in_progress' ? '#2e7d32' : '#1976d2', color: '#fff' }}>
                {p.status === 'in_progress' ? '🏗️ काम चालू' : '🟢 स्वीकृत'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
