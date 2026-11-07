import React, { useState, useEffect, useCallback } from 'react';
import { api, getLoc } from '../api';
import { syncJob } from '../firebase';
import { CITIES, getCityNameFromCoords } from './ProfileModal';

export default function CustomerPost({ token, meta, lang, refreshTrigger, onOpenBooking, onStartCall, showToast, t }) {
  const [activeSubTab, setActiveSubTab] = useState('post'); // 'post' or 'mine'
  const [skill, setSkill] = useState('');
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(1);
  const [address, setAddress] = useState('');
  const [jobCity, setJobCity] = useState('');
  const [jobCoords, setJobCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  // My jobs list
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [interestedWorkers, setInterestedWorkers] = useState({});
  const [loadingWorkers, setLoadingWorkers] = useState({});

  const loadMyJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await api('/jobs/mine', 'GET', null, token);
      setMyJobs(res.jobs || []);
    } catch (err) {
      showToast(err.message || "Failed to load your jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadMyJobs();
  }, [loadMyJobs, refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!skill) {
      showToast((t('reqd') || 'ज़रूरी जानकारी') + ': ' + t('skill'));
      return;
    }
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const todayStr = new Date().toISOString().split('T')[0];
      const jobLat = jobCoords?.lat ?? loc?.lat;
      const jobLng = jobCoords?.lng ?? loc?.lng;
      const fullAddress = [address, jobCity].filter(Boolean).join(', ');

      const payload = {
        skill,
        description: desc,
        budget: budget ? parseInt(budget, 10) : 0,
        start_date: startDate || todayStr,
        days: parseInt(days, 10) || 1,
        address: fullAddress || '',
        ...(jobLat != null ? { lat: jobLat, lng: jobLng } : {})
      };

      const res = await api('/jobs', 'POST', payload, token);
      syncJob(res.job || { id: res.id, ...payload });
      showToast(t('posted') || "काम डाल दिया गया!");

      // Reset form and view my jobs
      setSkill('');
      setDesc('');
      setBudget('');
      setAddress('');
      setJobCity('');
      setJobCoords(null);
      setActiveSubTab('mine');
      loadMyJobs();
    } catch (err) {
      showToast(err.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const loadInterested = async (jobId) => {
    setLoadingWorkers(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await api(`/jobs/${jobId}/interested`, 'GET', null, token);
      setInterestedWorkers(prev => ({ ...prev, [jobId]: res.workers || [] }));
    } catch (err) {
      showToast(err.message || "Could not fetch interested workers");
    } finally {
      setLoadingWorkers(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleCancelJob = async (jobId) => {
    if (!window.confirm("क्या आप सच में यह काम कैंसिल करना चाहते हैं?")) return;
    try {
      await api(`/jobs/${jobId}/cancel`, 'POST', null, token);
      showToast("काम कैंसिल कर दिया गया");
      loadMyJobs();
    } catch (err) {
      showToast(err.message || "Failed to cancel job");
    }
  };

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find(x => x.key === k);
    return s ? s[lang] : k;
  };

  return (
    <div>
      {/* Sub-Tabs: Post New Job vs My Jobs */}
      <div className="card" style={{ padding: '6px' }}>
        <div className="row">
          <button
            type="button"
            className={activeSubTab === 'post' ? '' : 'sec'}
            style={{ fontSize: '14px', padding: '10px' }}
            onClick={() => setActiveSubTab('post')}
          >
            ➕ {t('post')}
          </button>
          <button
            type="button"
            className={activeSubTab === 'mine' ? '' : 'sec'}
            style={{ fontSize: '14px', padding: '10px' }}
            onClick={() => { setActiveSubTab('mine'); loadMyJobs(); }}
          >
            📋 {t('myjobs') || 'मेरे काम'} {myJobs.length ? `(${myJobs.length})` : ''}
          </button>
        </div>
      </div>

      {activeSubTab === 'post' ? (
        <div className="card">
          <h2>📢 {t('post')}</h2>
          <div className="sub" style={{ marginBottom: '12px' }}>
            आपके गाँव / शहर के सभी फ्री मिस्त्रियों तक तुरंत सूचना पहुँचेगी
          </div>

          <form onSubmit={handleSubmit}>
            <label>{t('skill')} *</label>
            <select value={skill} onChange={(e) => setSkill(e.target.value)} required>
              <option value="">-- {t('skill')} चुनें --</option>
              {allSkills.map((s) => (
                <option key={s.key} value={s.key}>{s[lang] || s.key}</option>
              ))}
            </select>

            <label>{t('desc')}</label>
            <textarea
              rows="3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="काम का विवरण (उदा. 2 दिन की चिनाई व प्लास्टर)"
            />

            <div className="row">
              <div>
                <label>{t('budget')}</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="उदा. 700"
                />
              </div>
              <div>
                <label>{t('days')}</label>
                <input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
            </div>

            <label>{t('date')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <label>{t('address')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="गाँव / मोहल्ला / मकान नं."
            />

            <label>🏙️ काम का शहर / लोकेशन (City)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select
                value={jobCity}
                onChange={(e) => {
                  setJobCity(e.target.value);
                  const found = CITIES.find(c => c.name === e.target.value);
                  if (found) setJobCoords({ lat: found.lat, lng: found.lng });
                }}
                style={{ flex: 1, padding: '8px' }}
              >
                <option value="">-- शहर चुनें (Delhi, Noida, Lucknow, etc.) --</option>
                {CITIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="sec"
                style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
                onClick={async () => {
                  try {
                    showToast("📍 लोकेशन ले रहे हैं...");
                    const loc = await getLoc(true);
                    setJobCoords({ lat: loc.lat, lng: loc.lng });
                    const name = getCityNameFromCoords(loc.lat, loc.lng);
                    if (name) setJobCity(name);
                    showToast("📍 लोकेशन प्राप्त हुई!");
                  } catch (e) {
                    showToast(e.message || "GPS चालू करें");
                  }
                }}
              >
                📡 GPS लें
              </button>
            </div>
            {jobCoords && (
              <div style={{ fontSize: '12px', color: 'var(--g)', marginBottom: '12px' }}>
                📍 काम की लोकेशन: <b>{jobCity || `${jobCoords.lat.toFixed(3)}, ${jobCoords.lng.toFixed(3)}`}</b>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button type="submit" className="big" disabled={loading}>
                {loading ? 'पोस्ट हो रहा है…' : `📢 ${t('post')}`}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>📋 {t('myjobs') || 'मेरे काम'}</h2>
              <button
                type="button"
                className="sec"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={loadMyJobs}
                disabled={loadingJobs}
              >
                🔄 ताज़ा करें
              </button>
            </div>
          </div>

          {loadingJobs && (
            <div style={{ textAlign: 'center', padding: '16px' }} className="sub">
              लोड हो रहा है…
            </div>
          )}

          {!loadingJobs && myJobs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>📋</div>
              <b>आपने अभी कोई काम पोस्ट नहीं किया है</b>
              <div style={{ marginTop: '10px' }}>
                <button onClick={() => setActiveSubTab('post')}>
                  ➕ नया काम पोस्ट करें
                </button>
              </div>
            </div>
          )}

          {myJobs.map((j) => (
            <div key={j.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '17px' }}>{getSkillLabel(j.skill)}</b>
                <span className={`pill ${j.status === 'open' ? 'free' : j.status === 'assigned' ? 'busy' : 'offline'}`}>
                  {j.status === 'open' ? 'चालू' : j.status}
                </span>
              </div>

              <div className="sub" style={{ margin: '6px 0' }}>
                📅 {j.start_date || '-'} · ⏱️ {j.days || 1} {t('days')} · 💰 ₹{j.budget || '-'}/{t('daySfx') || 'दिन'}
              </div>

              {j.address && <div className="sub">📍 {j.address}</div>}
              {j.description && <p style={{ fontSize: '14px', margin: '6px 0' }}>{j.description}</p>}

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="sec"
                  style={{ flex: 1, padding: '8px' }}
                  onClick={() => loadInterested(j.id)}
                  disabled={loadingWorkers[j.id]}
                >
                  👷 {t('interestedw') || 'इच्छुक मिस्त्री'} {interestedWorkers[j.id] ? `(${interestedWorkers[j.id].length})` : ''}
                </button>

                {j.status === 'open' && (
                  <button
                    type="button"
                    className="warn"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    onClick={() => handleCancelJob(j.id)}
                  >
                    रद्द करें
                  </button>
                )}
              </div>

              {/* Interested Workers List for this Job */}
              {interestedWorkers[j.id] && (
                <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                  <div className="sub" style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                    इच्छुक मिस्त्री ({interestedWorkers[j.id].length}):
                  </div>

                  {interestedWorkers[j.id].length === 0 ? (
                    <div className="sub" style={{ fontStyle: 'italic' }}>
                      अभी किसी मिस्त्री ने रिक्वेस्ट नहीं भेजी है। आस-पास के मिस्त्री जल्द देखेंगे।
                    </div>
                  ) : (
                    interestedWorkers[j.id].map((w) => (
                      <div key={w.id} className="row" style={{ marginTop: '8px', background: '#f5f8f5', padding: '8px', borderRadius: '8px' }}>
                        <div>
                          <b>{w.name}</b>
                          <div className="sub">
                            📍 {w.distance_km != null ? `${w.distance_km} ${t('km')}` : ''} · 💰 ₹{w.quoted_rate || w.daily_rate || '-'}/{t('daySfx') || 'दिन'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flex: 'none' }}>
                          {w.phone && (
                            <button
                              type="button"
                              className="sec"
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                              onClick={() => {
                                if (onStartCall) {
                                  onStartCall({
                                    name: w.name || 'मिस्त्री',
                                    phone: w.phone,
                                    worker_id: w.id,
                                    booking_id: null
                                  });
                                } else {
                                  window.location.href = `tel:${w.phone}`;
                                }
                              }}
                            >
                              📞 {t('call')}
                            </button>
                          )}
                          <button
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => onOpenBooking && onOpenBooking(w, {
                              job_id: j.id,
                              skill: j.skill,
                              address: j.address,
                              start_date: j.start_date,
                              days: j.days,
                              budget: j.budget,
                              lat: j.lat,
                              lng: j.lng,
                              rate: w.quoted || w.daily_rate
                            })}
                          >
                            {t('book')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
