import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';

export default function CustomerContractors({ token, meta, lang, onOpenProject, onOpenChat, onStartCall, showToast, t }) {
  const [activeTab, setActiveTab] = useState('find'); // 'find' | 'my_projects'
  const [contractors, setContractors] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadContractors = async () => {
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) { }

      const q = new URLSearchParams();
      if (loc) {
        q.set('lat', loc.lat);
        q.set('lng', loc.lng);
      }
      const res = await api('/contractors?' + q.toString(), 'GET', null, token);
      setContractors(res.contractors || []);
    } catch (err) {
      showToast(err.message || "ठेकेदार लोड करने में विफल");
    } finally {
      setLoading(false);
    }
  };

  const loadMyProjects = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/projects', 'GET', null, token);
      setMyProjects(res.projects || []);
    } catch (err) {
      showToast(err.message || "प्रोजेक्ट्स लोड करने में विफल");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'find') {
      loadContractors();
    } else {
      loadMyProjects();
    }
  }, [activeTab, token]);

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? (s[lang] || s.hi || k) : k;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return <span className="pill" style={{ background: '#f57c00', color: '#fff' }}>🟡 ठेकेदार के जवाब का इंतज़ार</span>;
      case 'accepted':
        return <span className="pill" style={{ background: '#1976d2', color: '#fff' }}>🟢 ठेकेदार ने स्वीकार किया</span>;
      case 'in_progress':
        return <span className="pill" style={{ background: '#2e7d32', color: '#fff' }}>🏗️ साइट पर काम चालू</span>;
      case 'completed':
        return <span className="pill" style={{ background: '#388e3c', color: '#fff' }}>✅ प्रोजेक्ट पूरा हुआ</span>;
      case 'rejected':
        return <span className="pill" style={{ background: '#d32f2f', color: '#fff' }}>❌ ठेकेदार ने अस्वीकार किया</span>;
      case 'cancelled':
        return <span className="pill" style={{ background: '#757575', color: '#fff' }}>❌ रद्द</span>;
      default:
        return <span className="pill offline">{status}</span>;
    }
  };

  return (
    <div>
      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <h2 style={{ margin: '0 0 6px' }}>🏗️ {t('contractorsNear') || 'ठेकेदार और प्रोजेक्ट'}</h2>
        <div className="sub">{t('onePoint') || 'मकान निर्माण, दुकान या बड़े काम के लिए ठेकेदार खोजें'}</div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            className={activeTab === 'find' ? '' : 'sec'}
            style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 'bold' }}
            onClick={() => setActiveTab('find')}
          >
            🔍 ठेकेदार खोजें
          </button>
          <button
            className={activeTab === 'my_projects' ? '' : 'sec'}
            style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 'bold' }}
            onClick={() => setActiveTab('my_projects')}
          >
            📋 मेरे भेजे अनुरोध ({myProjects.length})
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {/* 1. FIND CONTRACTORS TAB */}
      {activeTab === 'find' && (
        <>
          {!loading && contractors.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏗️</div>
              <div>आपके आस-पास कोई ठेकेदार नहीं मिला। कृपया प्रोफ़ाइल में अपनी लोकेशन चेक करें।</div>
            </div>
          )}

          {contractors.map((c) => {
            const skills = Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').filter(Boolean);
            return (
              <div key={c.id} className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <b style={{ fontSize: '17px', color: '#222' }}>{c.company || c.name || t('contractor')}</b>
                    <div className="sub" style={{ margin: '3px 0' }}>
                      ⭐ {(c.rating_avg || 0).toFixed(1)} · 👥 {c.crew_count || 0} {t('crewSize') || 'साथी'}
                    </div>
                  </div>
                  {c.distance_km != null && (
                    <span className="sub" style={{ fontWeight: '600', color: '#2e7d32' }}>
                      📍 {c.distance_km.toFixed(1)} {t('km') || 'किमी'}
                    </span>
                  )}
                </div>

                <div className="skills" style={{ margin: '8px 0' }}>
                  {skills.map((sk) => (
                    <span key={sk}>{getSkillLabel(sk)}</span>
                  ))}
                </div>

                {c.about && <p style={{ fontSize: '13px', margin: '6px 0', color: '#555' }}>{c.about}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <div className="sub" style={{ fontSize: '13px' }}>
                    न्यूनतम बजट: <b>₹{(c.min_budget || 0).toLocaleString('en-IN')}</b>
                  </div>
                  <button
                    style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold', padding: '8px 14px' }}
                    onClick={() => onOpenProject(c)}
                  >
                    📩 प्रोजेक्ट अनुरोध भेजें
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* 2. MY SENT PROJECTS TAB */}
      {activeTab === 'my_projects' && (
        <>
          {!loading && myProjects.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
              <div>आपने अभी तक किसी ठेकेदार को प्रोजेक्ट अनुरोध नहीं भेजा है।</div>
              <button
                style={{ marginTop: '12px', fontSize: '13px' }}
                onClick={() => setActiveTab('find')}
              >
                🔍 ठेकेदार खोजें
              </button>
            </div>
          )}

          {myProjects.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                borderLeft: p.status === 'accepted' ? '4px solid #1976d2' : p.status === 'in_progress' ? '4px solid #2e7d32' : '4px solid #f57c00',
                marginBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <b style={{ fontSize: '16px', color: '#222' }}>{p.title}</b>
                  <div className="sub" style={{ margin: '3px 0' }}>
                    🏗️ ठेकेदार: <b>{p.contractor_name || 'Contractor'}</b>
                  </div>
                </div>
                <div>{getStatusBadge(p.status)}</div>
              </div>

              <div style={{ display: 'flex', gap: '16px', margin: '6px 0', fontSize: '13px' }}>
                <div>बजट: <b style={{ color: 'var(--g)' }}>₹{(p.total_budget || p.budget || 0).toLocaleString('en-IN')}</b></div>
                {p.days && <div>अवधि: <b>{p.days} दिन</b></div>}
                {p.workers_needed && <div>कारीगर: <b>{p.workers_needed}</b></div>}
              </div>

              {p.address && (
                <div style={{ fontSize: '12px', color: '#666', margin: '2px 0' }}>
                  📍 साइट पता: {p.address}
                </div>
              )}

              {p.description && (
                <div style={{ fontSize: '12px', color: '#555', background: '#f9f9f9', padding: '6px 8px', borderRadius: '4px', margin: '6px 0' }}>
                  {p.description}
                </div>
              )}

              {/* Direct Chat & Call with Contractor */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
                {p.contractor_phone && (
                  <a
                    href={`tel:${p.contractor_phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    📞 {p.contractor_phone}
                  </a>
                )}
                {onOpenChat && (
                  <button
                    type="button"
                    className="sec"
                    style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 'bold' }}
                    onClick={() => onOpenChat({
                      kind: 'projects',
                      id: p.id,
                      other_name: p.contractor_name || 'Contractor',
                      other_phone: p.contractor_phone || '',
                      other_id: p.contractor_id
                    })}
                  >
                    💬 ठेकेदार से चैट
                  </button>
                )}
              </div>

              {p.status === 'accepted' && (
                <div style={{ background: '#e3f2fd', color: '#0d47a1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', marginTop: '6px' }}>
                  🎉 ठेकेदार ने आपका प्रोजेक्ट स्वीकार कर लिया है! जल्द ही साइट पर काम शुरू होगा।
                </div>
              )}

              {p.status === 'in_progress' && (
                <div style={{ background: '#e8f5e9', color: '#1b5e20', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', marginTop: '6px' }}>
                  🏗️ प्रोजेक्ट पर काम प्रगति पर है।
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
