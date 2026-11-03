import React, { useState, useEffect, useCallback } from 'react';
import { api, getLoc } from '../api';

export default function WorkerJobs({ token, meta, lang, refreshTrigger, showToast, t }) {
  const [radius, setRadius] = useState(25);
  const [filterSkill, setFilterSkill] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interestSent, setInterestSent] = useState({});

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const q = new URLSearchParams({
        radius_km: radius,
        all_skills: 'true'
      });
      if (loc) {
        q.set('lat', loc.lat);
        q.set('lng', loc.lng);
      }
      if (filterSkill) {
        q.set('skill', filterSkill);
      }

      const res = await api('/worker/jobs?' + q.toString(), 'GET', null, token);
      setJobs(res.jobs || []);
    } catch (err) {
      showToast(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [radius, filterSkill, token, showToast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs, refreshTrigger]);

  const handleInterest = async (jobId) => {
    try {
      await api(`/jobs/${jobId}/interest`, 'POST', { rate: 0 }, token);
      setInterestSent(prev => ({ ...prev, [jobId]: true }));
      showToast(t('interestsent') || "ग्राहक को बता दिया गया है!");
    } catch (err) {
      showToast(err.message || "Could not send interest");
    }
  };

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      {/* Search & Distance Filters */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0 }}>🔨 {t('jobs')}</h2>
          <button
            type="button"
            className="sec"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={loadJobs}
            disabled={loading}
          >
            🔄 {loading ? 'लोडिंग…' : 'ताज़ा करें'}
          </button>
        </div>

        <div className="row">
          <div>
            <label>{t('skills')}</label>
            <select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
              <option value="">-- {t('all')} --</option>
              {allSkills.map((s) => (
                <option key={s.key} value={s.key}>{s[lang] || s.key}</option>
              ))}
            </select>
          </div>
          <div>
            <label>{t('dist')}: <b>{radius}</b> {t('km')}</label>
            <input
              type="range"
              min="1"
              max="50"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px' }} className="sub">
          काम खोज रहे हैं…
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
          <div style={{ fontSize: '38px', marginBottom: '8px' }}>🔍</div>
          <b style={{ fontSize: '16px' }}>{t('nojobs')}</b>
          <div className="sub" style={{ marginTop: '6px' }}>
            दूरी (कि.मी.) का दायरा बढ़ाकर देखें या ऊपर <b>ताज़ा करें</b> दबाएँ
          </div>
        </div>
      )}

      {/* Jobs List */}
      {jobs.map((job) => (
        <div key={job.id} className="card" style={{ borderLeft: job.matches_skill ? '4px solid var(--g2)' : '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="pill free" style={{ fontSize: '11px', marginBottom: '4px' }}>
                {getSkillLabel(job.skill)}
              </span>
              <h3 style={{ margin: '4px 0 2px', fontSize: '18px' }}>
                ₹{job.budget || job.daily_rate || '-'}/{t('daySfx') || 'दिन'}
              </h3>
            </div>
            {job.distance_km != null ? (
              <span className="sub" style={{ fontWeight: '600', color: 'var(--g)' }}>
                📍 {job.distance_km} {t('km')} {t('away')}
              </span>
            ) : (
              <span className="sub">📍 आस-पास</span>
            )}
          </div>

          <div className="sub" style={{ margin: '6px 0 2px' }}>
            👤 <b>{job.customer_name || t('customer')}</b> · 📅 {job.start_date || '-'} · ⏱️ {job.days || 1} {t('days')}
          </div>

          {job.address && (
            <div className="sub" style={{ color: '#444' }}>
              🏠 पता: {job.address}
            </div>
          )}

          {job.description && (
            <p style={{ margin: '8px 0', fontSize: '14px', background: '#f9fbf9', padding: '8px', borderRadius: '8px' }}>
              📝 {job.description}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '8px' }}>
            {job.customer_phone ? (
              <a href={`tel:${job.customer_phone}`} style={{ textDecoration: 'none', flex: 1 }}>
                <button type="button" className="sec" style={{ width: '100%', padding: '10px' }}>
                  📞 {t('call')}
                </button>
              </a>
            ) : (
              <span />
            )}

            <button
              type="button"
              className={interestSent[job.id] ? 'sec' : ''}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => handleInterest(job.id)}
              disabled={interestSent[job.id]}
            >
              {interestSent[job.id] ? '✔ ' + t('interestsent') : '✋ ' + t('interested')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
