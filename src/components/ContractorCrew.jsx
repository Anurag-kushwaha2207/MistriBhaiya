import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorCrew({ token, meta, lang, showToast, t }) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Advance modal
  const [payModalUser, setPayModalUser] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('advance');

  const loadCrew = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/crew', 'GET', null, token);
      setCrew(res.crew || []);
    } catch (err) {
      showToast(err.message || "Failed to load crew");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrew();
  }, [token]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!name || (!isOffline && !phone)) {
      showToast(t('reqd'));
      return;
    }
    try {
      await api('/contractor/crew/invite', 'POST', {
        name,
        phone: isOffline ? undefined : phone.trim(),
        daily_rate: dailyRate ? parseInt(dailyRate, 10) : undefined,
        is_offline: isOffline
      }, token);
      showToast(t('saved'));
      setName('');
      setPhone('');
      setDailyRate('');
      setShowAddForm(false);
      loadCrew();
    } catch (err) {
      showToast(err.message || "Failed to add crew member");
    }
  };

  const handleAttendance = async (crewId, present) => {
    try {
      await api(`/contractor/crew/${crewId}/attendance`, 'POST', { present }, token);
      showToast(t('markedOk'));
      loadCrew();
    } catch (err) {
      showToast(err.message || "Attendance failed");
    }
  };

  const handleRemove = async (crewId) => {
    if (!window.confirm("क्या आप इस साथी को हटाना चाहते हैं?")) return;
    try {
      await api(`/contractor/crew/${crewId}`, 'DELETE', null, token);
      showToast(t('saved'));
      loadCrew();
    } catch (err) {
      showToast(err.message || "Error removing member");
    }
  };

  const handleSavePayment = async () => {
    if (!payAmount || !payModalUser) return;
    try {
      await api(`/contractor/crew/${payModalUser.id}/payment`, 'POST', {
        amount: parseInt(payAmount, 10),
        type: payType
      }, token);
      showToast(t('saved'));
      setPayModalUser(null);
      setPayAmount('');
      loadCrew();
    } catch (err) {
      showToast(err.message || "Payment failed");
    }
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>👥 {t('crew')}</h2>
          <button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'बंद करें' : `+ ${t('addCrew')}`}
          </button>
        </div>
      </div>

      {/* Add Crew Member Form */}
      {showAddForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--g)' }}>
          <h3>+ {t('addCrew')}</h3>
          <form onSubmit={handleAddMember}>
            <label>{t('crewName')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="नाम"
              required
            />

            <div style={{ margin: '8px 0' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={isOffline}
                  onChange={(e) => setIsOffline(e.target.checked)}
                />
                {t('phoneOpt')}
              </label>
            </div>

            {!isOffline && (
              <>
                <label>{t('crewPhone')}</label>
                <input
                  type="tel"
                  maxLength="10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </>
            )}

            <label>{t('rate')}</label>
            <input
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              placeholder="उदा. 600"
            />

            <div style={{ marginTop: '12px' }}>
              <button type="submit" className="big">
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && crew.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
          <div>{t('noCrew')}</div>
        </div>
      )}

      {crew.map((member) => (
        <div key={member.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: '16px' }}>{member.name}</b>
            <span className={`pill ${member.status === 'active' ? 'free' : 'offline'}`}>
              {member.status === 'active' ? t('inCrew') : t('invited')}
            </span>
          </div>

          <div className="sub" style={{ margin: '4px 0' }}>
            📱 {member.phone || t('offlineWorker')} · ₹{member.daily_rate || 0}/{t('daySfx') || 'दिन'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="sec"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                onClick={() => handleAttendance(member.id, true)}
              >
                ✔ {t('present')}
              </button>
              <button
                type="button"
                className="warn"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                onClick={() => handleAttendance(member.id, false)}
              >
                ✖ {t('absent')}
              </button>
              <button
                type="button"
                className="sec"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                onClick={() => setPayModalUser(member)}
              >
                ₹ {t('advance')}
              </button>
            </div>

            <button
              type="button"
              className="warn"
              style={{ padding: '6px 10px', fontSize: '12px', background: 'none', color: 'var(--red)', border: '1px solid var(--red)' }}
              onClick={() => handleRemove(member.id)}
            >
              {t('remove')}
            </button>
          </div>
        </div>
      ))}

      {/* Payment / Advance Modal */}
      {payModalUser && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setPayModalUser(null); }}>
          <div className="sheet">
            <h3>₹ {payModalUser.name} को भुगतान / एडवांस</h3>
            <label>{t('amount')}</label>
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
                {t('advance')}
              </button>
              <button
                type="button"
                className={payType === 'payment' ? '' : 'sec'}
                onClick={() => setPayType('payment')}
              >
                {t('payment')}
              </button>
            </div>
            <div className="row" style={{ marginTop: '14px' }}>
              <button onClick={handleSavePayment}>{t('save')}</button>
              <button className="sec" onClick={() => setPayModalUser(null)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

