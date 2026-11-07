import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';
import { syncBooking } from '../firebase';

export function BookingModal({ worker, jobContext = {}, token, onClose, onSuccess, showToast, t }) {
  const workerSkills = Array.isArray(worker?.skills)
    ? worker.skills
    : (worker?.skills ? worker.skills.split(',').map(s => s.trim()).filter(Boolean) : []);
  
  const defaultSkill = (jobContext?.skill && workerSkills.includes(jobContext.skill))
    ? jobContext.skill
    : (workerSkills[0] || 'rajmistri');

  const [selectedSkill, setSelectedSkill] = useState(defaultSkill);
  const [date, setDate] = useState(jobContext?.start_date || '');
  const [days, setDays] = useState(jobContext?.days || 1);
  const [rate, setRate] = useState(jobContext?.rate || worker?.daily_rate || 0);
  const [address, setAddress] = useState(jobContext?.address || '');
  const [note, setNote] = useState(jobContext?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const todayStr = new Date().toISOString().split('T')[0];
      const effLat = jobContext?.lat ?? loc?.lat;
      const effLng = jobContext?.lng ?? loc?.lng;

      const payload = {
        worker_id: worker.id,
        skill: selectedSkill,
        job_id: jobContext?.job_id || null,
        start_date: date || todayStr,
        days: parseInt(days, 10) || 1,
        agreed_rate: parseInt(rate, 10) || worker.daily_rate || 0,
        address: address || '',
        note: note || '',
        ...(effLat != null && effLng != null ? { lat: effLat, lng: effLng } : {})
      };

      const res = await api('/bookings', 'POST', payload, token);
      if (res.booking) {
        syncBooking(res.booking);
      }
      showToast(t('sent'));
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('book')}: {worker.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {workerSkills.length > 1 ? (
            <div>
              <label>{t('skills')}</label>
              <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                {workerSkills.map((sk) => (
                  <option key={sk} value={sk}>{sk}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: '10px' }}>
              <span className="chip active">🛠️ {selectedSkill}</span>
            </div>
          )}

          <label>{t('rate')}</label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />

          <div className="row">
            <div>
              <label>{t('date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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

          <label>{t('address')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="काम की जगह / पता"
          />

          <label>{t('note')}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="काम का विवरण"
          />

          <div style={{ margin: '14px 0' }}>
            <button type="submit" className="big" disabled={loading}>
              {loading ? 'भेज रहे हैं…' : `📤 ${t('send')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectModal({ contractor, token, onClose, onSuccess, showToast, t }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState(contractor?.min_budget || '');
  const [workersNeeded, setWorkersNeeded] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      showToast(t('reqd') + ': ' + t('projTitle'));
      return;
    }
    setLoading(true);
    try {
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}

      const payload = {
        contractor_id: contractor.id,
        title,
        description: desc,
        budget: parseInt(budget, 10) || 0,
        total_budget: parseInt(budget, 10) || 0,
        start_date: new Date().toISOString().split('T')[0],
        days: 30,
        workers_needed: parseInt(workersNeeded, 10) || 1,
        ...(loc ? { lat: loc.lat, lng: loc.lng } : {})
      };

      await api('/contractor/projects', 'POST', payload, token);
      showToast(t('sent'));
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('sendProject')}: {contractor.company || contractor.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>{t('projTitle')} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="उदा. 2 कमरे का मकान निर्माण"
            required
          />

          <label>{t('desc')}</label>
          <textarea
            rows="2"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className="row">
            <div>
              <label>{t('totalBudget')}</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div>
              <label>{t('workersNeeded')}</label>
              <input
                type="number"
                min="1"
                value={workersNeeded}
                onChange={(e) => setWorkersNeeded(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <button type="submit" className="big" disabled={loading}>
              {loading ? 'भेज रहे हैं…' : `📤 ${t('sendProject')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CounterModal({ kind, id, token, onClose, onSuccess, showToast, t }) {
  const [data, setData] = useState(null);
  const [rate, setRate] = useState('');
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const isProj = kind === 'projects';

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/${kind}/${id}/negotiation`, 'GET', null, token);
        setData(res);
        setRate(res.current?.rate || '');
        setDays(res.current?.days || '');
      } catch (err) {
        showToast(err.message || "Failed to load negotiation");
      }
    })();
  }, [kind, id, token]);

  const handleSendCounter = async () => {
    setLoading(true);
    try {
      await api(`/${kind}/${id}/counter`, 'POST', {
        rate: parseInt(rate, 10),
        days: days ? parseInt(days, 10) : null,
        note
      }, token);
      showToast(t('sent'));
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Counter failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('counterTitle')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {data && (
          <div className="sub">
            {t('round')} {data.rounds}/{data.max_rounds}
          </div>
        )}

        {/* History */}
        <div className="neg">
          {(data?.offers || []).map((o, idx) => (
            <div key={idx} className={`bubble ${o.mine ? 'me' : 'ot'}`}>
              <b>{o.mine ? t('you') : o.from}</b>: ₹{o.rate}
              {isProj ? '' : `/${t('daySfx') || 'दिन'}`} · {o.days} {t('days')}
              {o.note && <div className="sub">{o.note}</div>}
            </div>
          ))}
        </div>

        <label>{isProj ? t('newBudget') : t('newRate')}</label>
        <input
          type="number"
          min="50"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />

        <label>{t('newDays')}</label>
        <input
          type="number"
          min="1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />

        <label>{t('note')}</label>
        <input
          type="text"
          maxLength="200"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="big"
            onClick={handleSendCounter}
            disabled={loading || (data && !data.my_turn)}
          >
            {loading ? 'भेज रहे हैं…' : t('sendCounter')}
          </button>
          <button className="big sec" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfferModal({ offer, token, onClose, onAccept, showToast, t }) {
  const [secondsLeft, setSecondsLeft] = useState(offer?.expires_in || 30);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  const handleAccept = async () => {
    try {
      const reqId = offer.request_id || offer.offer_id || offer.id;
      await api(`/instant/${reqId}/accept`, 'POST', null, token);
      showToast(t('saved'));
      if (onAccept) onAccept(offer);
      onClose();
    } catch (err) {
      showToast(err.message || "Offer accept failed");
    }
  };

  const handleDecline = async () => {
    try {
      const reqId = offer.request_id || offer.offer_id || offer.id;
      await api(`/instant/${reqId}/decline`, 'POST', null, token);
    } catch (e) {}
    onClose();
  };

  return (
    <div className="modal">
      <div className="sheet" style={{ borderTop: '6px solid var(--o)' }}>
        <h2>🎉 {t('offerTitle')}</h2>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--g)', margin: '6px 0' }}>
          ₹{offer.daily_rate} / {t('daySfx') || 'दिन'}
        </div>
        <div className="sub">
          📍 {offer.address || offer.village || 'आस-पास का काम'}
        </div>
        {offer.description && <p>{offer.description}</p>}

        <div style={{ margin: '12px 0', textAlign: 'center', fontSize: '16px' }}>
          ⏱️ <b>{secondsLeft}</b> {t('seconds')}
        </div>

        <div className="row">
          <button className="big" style={{ background: '#2e7d32' }} onClick={handleAccept}>
            {t('acceptOffer')}
          </button>
          <button className="big warn" onClick={handleDecline}>
            {t('reject')}
          </button>
        </div>
      </div>
    </div>
  );
}

