import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';

export default function CustomerFind({ token, meta, lang, onOpenBooking, onStartInstant, showToast, t }) {
  const [skill, setSkill] = useState('');
  const [radius, setRadius] = useState(15);
  const [freeOnly, setFreeOnly] = useState(false);
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('smart');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const q = new URLSearchParams();
      if (skill) q.set('skill', skill);
      if (radius) q.set('radius_km', radius);
      if (freeOnly) q.set('free_only', 'true');
      if (date) q.set('date', date);
      if (sort) q.set('sort', sort);
      if (loc) {
        q.set('lat', loc.lat);
        q.set('lng', loc.lng);
      }

      const res = await api('/workers?' + q.toString(), 'GET', null, token);
      setWorkers(res.workers || []);
    } catch (err) {
      showToast(err.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [skill, radius, freeOnly, date, sort, token]);

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      {/* ⚡ Instant Dispatch Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #fff3e0, #ffe082)',
          border: '1px solid #ffb300',
          cursor: 'pointer'
        }}
        onClick={onStartInstant}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '30px' }}>⚡</div>
          <div>
            <b style={{ fontSize: '16px', color: '#e65100' }}>{t('instant')}</b>
            <div className="sub" style={{ color: '#5d4037', marginTop: '2px' }}>
              {t('instantSub')}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card">
        <label>{t('skills')}</label>
        <select value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">-- {t('all')} --</option>
          {allSkills.map((s) => (
            <option key={s.key} value={s.key}>{s[lang] || s.key}</option>
          ))}
        </select>

        <div className="row" style={{ marginTop: '6px' }}>
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
          <div>
            <label>{t('sort')}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="smart">{t('smart')}</option>
              <option value="rating">{t('rating')}</option>
              <option value="rate">{t('sortRate') || 'कम मज़दूरी'}</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            {t('freeonly')}
          </label>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '14px' }} className="sub">ढूँढ रहे हैं…</div>}

      {!loading && workers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👷</div>
          <div>{t('nowork')}</div>
          <div className="sub" style={{ marginTop: '4px' }}>कृपया दूरी बढ़ाएँ या अन्य स्किल चुनें</div>
        </div>
      )}

      {/* Workers List */}
      {workers.map((w) => {
        const workerSkills = Array.isArray(w.skills) ? w.skills : (w.skills || '').split(',').filter(Boolean);
        return (
          <div key={w.id} className="card">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="avatar-md">
                {w.avatar ? (
                  <img src={w.avatar} alt="" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '16px' }}>{w.name}</b>
                  <span className={`pill ${w.status === 'free' ? 'free' : w.status === 'busy' ? 'busy' : 'offline'}`}>
                    {t('s_' + (w.status || 'offline'))}
                  </span>
                </div>
                <div className="sub">
                  📍 {w.village || ''} {w.distance_km != null ? `· ${w.distance_km.toFixed(1)} ${t('km')} ${t('away')}` : ''}
                </div>
                <div className="sub">
                  ⭐ {(w.rating_avg || 0).toFixed(1)} ({w.rating_count || 0}) · {w.experience_years || 0} {t('exp')}
                </div>
              </div>
            </div>

            <div className="skills" style={{ margin: '8px 0' }}>
              {workerSkills.map((sk) => (
                <span key={sk}>{getSkillLabel(sk)}</span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--g)' }}>
                ₹{w.daily_rate || 0} / {t('daySfx') || 'दिन'}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`tel:${w.phone}`}
                  style={{ textDecoration: 'none' }}
                >
                  <button type="button" className="sec" style={{ padding: '8px 12px' }}>
                    {t('call')}
                  </button>
                </a>
                <button
                  type="button"
                  style={{ padding: '8px 14px' }}
                  onClick={() => onOpenBooking(w)}
                >
                  {t('book')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

