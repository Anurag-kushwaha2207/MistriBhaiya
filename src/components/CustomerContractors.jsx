import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';

export default function CustomerContractors({ token, meta, lang, onOpenProject, showToast, t }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadContractors = async () => {
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const q = new URLSearchParams();
      if (loc) {
        q.set('lat', loc.lat);
        q.set('lng', loc.lng);
      }
      const res = await api('/contractors?' + q.toString(), 'GET', null, token);
      setContractors(res.contractors || []);
    } catch (err) {
      showToast(err.message || "Failed to load contractors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractors();
  }, [token]);

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      <div className="card">
        <h2>🏗️ {t('contractorsNear')}</h2>
        <div className="sub">{t('onePoint')}</div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && contractors.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏗️</div>
          <div>कोई ठेकेदार नहीं मिला</div>
        </div>
      )}

      {contractors.map((c) => {
        const skills = Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').filter(Boolean);
        return (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <b style={{ fontSize: '17px' }}>{c.company || c.name || t('contractor')}</b>
                <div className="sub">
                  ⭐ {(c.rating_avg || 0).toFixed(1)} · 👥 {c.crew_count || 0} {t('crewSize')}
                </div>
              </div>
              {c.distance_km != null && (
                <span className="sub">
                  📍 {c.distance_km.toFixed(1)} {t('km')}
                </span>
              )}
            </div>

            <div className="skills" style={{ margin: '8px 0' }}>
              {skills.map((sk) => (
                <span key={sk}>{getSkillLabel(sk)}</span>
              ))}
            </div>

            {c.about && <p style={{ fontSize: '13px', margin: '4px 0', color: '#555' }}>{c.about}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div className="sub">
                न्यूनतम बजट: <b>₹{(c.min_budget || 0).toLocaleString('en-IN')}</b>
              </div>
              <button onClick={() => onOpenProject(c)}>
                {t('sendProject')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

