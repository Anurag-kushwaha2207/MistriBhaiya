import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';

export default function ContractorCrew({ token, meta, lang = 'hi', onOpenChat, onStartCall, showToast, t }) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('online'); // 'online' | 'manual'

  // Online workers search
  const [onlineWorkers, setOnlineWorkers] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [invitedWorkerIds, setInvitedWorkerIds] = useState(new Set());

  // Manual Add Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Advance modal
  const [payModalUser, setPayModalUser] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('advance');

  const isEn = lang === 'en';

  const loadCrew = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/crew', 'GET', null, token);
      setCrew(res.crew || []);
    } catch (err) {
      showToast(err.message || "क्रू लोड करने में विफल");
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineWorkers = async () => {
    setLoadingOnline(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const q = new URLSearchParams();
      q.set('free_only', 'true');
      if (loc) {
        q.set('lat', loc.lat);
        q.set('lng', loc.lng);
      }
      const res = await api('/workers?' + q.toString(), 'GET', null, token);
      setOnlineWorkers(res.workers || []);
    } catch (err) {
      showToast(err.message || "ऑनलाइन मिस्त्री लोड करने में विफल");
    } finally {
      setLoadingOnline(false);
    }
  };

  useEffect(() => {
    loadCrew();
  }, [token]);

  useEffect(() => {
    if (showAddModal && addMode === 'online') {
      loadOnlineWorkers();
    }
  }, [showAddModal, addMode]);

  const handleSendInvite = async (worker) => {
    try {
      await api(`/contractor/crew/from-worker/${worker.id}`, 'POST', {
        daily_rate: worker.daily_rate || 600
      }, token);
      setInvitedWorkerIds((prev) => new Set([...prev, worker.id]));
      showToast(isEn ? `📩 Invite sent to ${worker.name}! Waiting for acceptance.` : `📩 ${worker.name} को न्योता भेज दिया गया! उनके स्वीकार करते ही जुड़ जाएंगे।`);
      loadCrew();
    } catch (err) {
      showToast(err.message || "न्योता भेजने में विफल");
    }
  };

  const handleManualAddMember = async (e) => {
    e.preventDefault();
    if (!name || (!isOffline && !phone)) {
      showToast(t('reqd') || "नाम और फ़ोन नंबर भरें");
      return;
    }
    try {
      await api('/contractor/crew/invite', 'POST', {
        name: name.trim(),
        phone: isOffline ? undefined : phone.trim(),
        daily_rate: dailyRate ? parseInt(dailyRate, 10) : undefined,
        is_offline: isOffline
      }, token);
      showToast(t('saved') || "साथी जोड़ दिया गया!");
      setName('');
      setPhone('');
      setDailyRate('');
      setShowAddModal(false);
      loadCrew();
    } catch (err) {
      showToast(err.message || "साथी जोड़ने में विफल");
    }
  };

  const handleAttendance = async (crewId, present) => {
    try {
      await api(`/contractor/crew/${crewId}/attendance`, 'POST', { present }, token);
      showToast(t('markedOk') || "हाज़िरी दर्ज!");
      loadCrew();
    } catch (err) {
      showToast(err.message || "Attendance failed");
    }
  };

  const handleRemove = async (crewId) => {
    if (!window.confirm("क्या आप इस साथी को अपनी टीम से हटाना चाहते हैं?")) return;
    try {
      await api(`/contractor/crew/${crewId}`, 'DELETE', null, token);
      showToast(t('saved'));
      loadCrew();
    } catch (err) {
      showToast(err.message || "हटाने में समस्या आई");
    }
  };

  const handleSavePayment = async () => {
    if (!payAmount || !payModalUser) return;
    try {
      await api(`/contractor/crew/${payModalUser.id}/payment`, 'POST', {
        amount: parseInt(payAmount, 10),
        type: payType
      }, token);
      showToast(t('saved') || "भुगतान दर्ज!");
      setPayModalUser(null);
      setPayAmount('');
      loadCrew();
    } catch (err) {
      showToast(err.message || "Payment failed");
    }
  };

  const allSkills = meta?.skills || [];
  const getSkillLabel = (k) => {
    const s = allSkills.find((x) => x.key === k);
    return s ? (s[lang] || s.hi || k) : k;
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>👥 {t('crew') || (isEn ? 'Crew Members' : 'क्रू / साथी')}</h2>
          <div className="sub" style={{ marginTop: '2px' }}>
            कुल साथी: <b>{crew.length}</b> · एक्टिव: <b>{crew.filter(c => c.status === 'active').length}</b>
          </div>
        </div>
        <button
          style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold', padding: '8px 14px' }}
          onClick={() => setShowAddModal(true)}
        >
          + {t('addCrew') || (isEn ? 'Add Mistri' : 'मिस्त्री जोड़ें')}
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && crew.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
          <div>{t('noCrew') || (isEn ? 'No crew members yet. Click "+ Add Mistri" to find online workers.' : 'अभी कोई साथी नहीं जुड़ा है। ऊपर "+ मिस्त्री जोड़ें" दबाएं।')}</div>
        </div>
      )}

      {/* Crew Members List */}
      {crew.map((member) => (
        <div key={member.id} className="card" style={{ marginBottom: '12px', borderLeft: member.status === 'active' ? '4px solid #2e7d32' : '4px solid #f57c00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <b style={{ fontSize: '16px', color: '#222' }}>{member.name}</b>
              <div className="sub" style={{ margin: '4px 0' }}>
                {member.skills ? `🛠️ ${member.skills} · ` : ''}
                ₹{member.daily_rate || 0}/{t('daySfx') || (isEn ? 'day' : 'दिन')}
              </div>
            </div>
            <span
              className="pill"
              style={{
                background: member.status === 'active' ? '#2e7d32' : '#f57c00',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              {member.status === 'active' ? (isEn ? '🟢 Active Member' : '🟢 एक्टिव साथी') : (isEn ? '⏳ Invite Pending' : '⏳ न्योता भेजा (मंज़ूरी का इंतज़ार)')}
            </span>
          </div>

          {/* Contact & Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}
                >
                  📞 {member.phone}
                </a>
              )}
              {onOpenChat && member.worker_id && (
                <button
                  type="button"
                  className="sec"
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                  onClick={() => onOpenChat({ kind: 'bookings', id: member.id, other_name: member.name, other_phone: member.phone, other_id: member.worker_id })}
                >
                  💬 चैट
                </button>
              )}
            </div>

            {/* Attendance & Payments */}
            {member.status === 'active' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="sec"
                  style={{ padding: '5px 9px', fontSize: '12px' }}
                  onClick={() => handleAttendance(member.id, true)}
                  title="आज हाज़िर दर्ज करें"
                >
                  ✔ {t('present') || 'हाज़िर'}
                </button>
                <button
                  type="button"
                  className="warn"
                  style={{ padding: '5px 9px', fontSize: '12px' }}
                  onClick={() => handleAttendance(member.id, false)}
                  title="आज गैरहाज़िर दर्ज करें"
                >
                  ✖ {t('absent') || 'गैरहाज़िर'}
                </button>
                <button
                  type="button"
                  className="sec"
                  style={{ padding: '5px 9px', fontSize: '12px' }}
                  onClick={() => setPayModalUser(member)}
                >
                  💰 {t('advance') || 'भुगतान'}
                </button>
              </div>
            )}

            <button
              type="button"
              className="warn"
              style={{ padding: '4px 8px', fontSize: '11px', background: 'none', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '4px' }}
              onClick={() => handleRemove(member.id)}
            >
              हटाएं
            </button>
          </div>
        </div>
      ))}

      {/* Add Mistri Modal */}
      {showAddModal && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setShowAddModal(false); }}>
          <div className="sheet" style={{ maxHeight: '90vh', overflowY: 'auto', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b5e20' }}>
                ➕ {isEn ? 'Add Mistri / Labour' : 'मिस्त्री / मज़दूर जोड़ें'}
              </h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            {/* Tabs for Add Mode */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                className={addMode === 'online' ? '' : 'sec'}
                style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 'bold' }}
                onClick={() => setAddMode('online')}
              >
                🟡 {isEn ? 'Browse Online (Free)' : 'ऑनलाइन मिस्त्री खोजें'}
              </button>
              <button
                className={addMode === 'manual' ? '' : 'sec'}
                style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 'bold' }}
                onClick={() => setAddMode('manual')}
              >
                ✍️ {isEn ? 'Direct Phone Number' : 'फ़ोन नंबर से जोड़ें'}
              </button>
            </div>

            {/* 1. ONLINE FREE WORKERS LIST */}
            {addMode === 'online' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#555' }}>
                    {isEn ? 'Only workers currently Free & Online appear here:' : 'यहाँ केवल वही मिस्त्री दिख रहे हैं जो अभी फ्री (पीला) हैं:'}
                  </div>
                  <button className="sec" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={loadOnlineWorkers} disabled={loadingOnline}>
                    🔄 रीफ्रेश
                  </button>
                </div>

                {loadingOnline && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">मिस्त्री लोड हो रहे हैं…</div>}

                {!loadingOnline && onlineWorkers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', background: '#fafafa', borderRadius: '10px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '6px' }}>👷</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {isEn ? 'No free mistris found right now in your area.' : 'अभी आपके क्षेत्र में कोई मिस्त्री फ्री नहीं मिला।'}
                    </div>
                    <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                      मिस्त्री जब ऐप में "मैं आज फ्री हूँ" (पीला) पर क्लिक करेंगे, तब यहाँ दिखेंगे।
                    </div>
                  </div>
                )}

                {onlineWorkers.map((w) => {
                  const hasInvited = invitedWorkerIds.has(w.id) || crew.some(c => c.worker_id === w.id);
                  const skills = Array.isArray(w.skills) ? w.skills : (w.skills || '').split(',').filter(Boolean);
                  return (
                    <div
                      key={w.id}
                      style={{
                        background: '#f9fbf9',
                        border: '1.5px solid #dceedc',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <b style={{ fontSize: '16px', color: '#222' }}>{w.name}</b>
                          <div className="sub" style={{ fontSize: '12px', margin: '2px 0' }}>
                            ⭐ {(w.rating_avg || 0).toFixed(1)} · ₹{w.daily_rate || 600}/{isEn ? 'day' : 'दिन'}
                            {w.distance_km != null ? ` · 📍 ${w.distance_km.toFixed(1)} km` : ''}
                          </div>
                        </div>
                        <span className="pill" style={{ background: '#fbc02d', color: '#000', fontWeight: 'bold', fontSize: '11px' }}>
                          🟡 Free
                        </span>
                      </div>

                      <div className="skills" style={{ margin: '6px 0' }}>
                        {skills.map((sk) => (
                          <span key={sk} style={{ fontSize: '11px' }}>{getSkillLabel(sk)}</span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        {hasInvited ? (
                          <span style={{ fontSize: '12px', color: '#e65100', fontWeight: 'bold' }}>
                            ⏳ न्योता भेजा गया (मंज़ूरी का इंतज़ार)
                          </span>
                        ) : (
                          <button
                            style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold', padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => handleSendInvite(w)}
                          >
                            📩 न्योता भेजें (Send Invite)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. DIRECT MANUAL PHONE ADD FORM */}
            {addMode === 'manual' && (
              <form onSubmit={handleManualAddMember}>
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>{t('crewName') || 'साथी का नाम'} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. रामू हेल्पर"
                  style={{ marginBottom: '10px' }}
                  required
                />

                <div style={{ margin: '8px 0' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={isOffline}
                      onChange={(e) => setIsOffline(e.target.checked)}
                    />
                    {isEn ? 'This person does not have a phone (Offline Labour)' : 'फ़ोन नहीं है (ऑफ़लाइन मज़दूर / हेल्पर)'}
                  </label>
                </div>

                {!isOffline && (
                  <>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>{t('crewPhone') || 'मोबाइल नंबर (10 Digits)'} *</label>
                    <input
                      type="tel"
                      maxLength="10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      style={{ marginBottom: '10px' }}
                      required={!isOffline}
                    />
                  </>
                )}

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>{t('rate') || 'दैनिक मज़दूरी (₹)'}</label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="उदा. 600"
                  style={{ marginBottom: '14px' }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="big" style={{ flex: 1, background: '#2e7d32' }}>
                    💾 {isEn ? 'Add Member' : 'साथी जोड़ें'}
                  </button>
                  <button type="button" className="big sec" onClick={() => setShowAddModal(false)}>
                    {t('close') || 'बंद करें'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment / Advance Modal */}
      {payModalUser && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setPayModalUser(null); }}>
          <div className="sheet">
            <h3>₹ {payModalUser.name} को भुगतान / एडवांस</h3>
            <label>{t('amount') || 'रकम (₹)'}</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="उदा. 500"
            />
            <div className="row" style={{ margin: '10px 0' }}>
              <button
                type="button"
                className={payType === 'advance' ? '' : 'sec'}
                onClick={() => setPayType('advance')}
              >
                {t('advance') || 'एडवांस'}
              </button>
              <button
                type="button"
                className={payType === 'payment' ? '' : 'sec'}
                onClick={() => setPayType('payment')}
              >
                {t('payment') || 'पूरा भुगतान'}
              </button>
            </div>
            <div className="row" style={{ marginTop: '14px' }}>
              <button onClick={handleSavePayment}>{t('save') || 'सेव करें'}</button>
              <button className="sec" onClick={() => setPayModalUser(null)}>{t('close') || 'बंद करें'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
