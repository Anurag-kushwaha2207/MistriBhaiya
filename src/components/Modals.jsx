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
  const [address, setAddress] = useState('');
  const [skill, setSkill] = useState(() => (contractor?.skills && contractor.skills.length > 0 ? contractor.skills[0] : 'rajmistri'));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(30);
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
        address,
        skill,
        budget: parseInt(budget, 10) || 0,
        total_budget: parseInt(budget, 10) || 0,
        start_date: startDate,
        days: parseInt(days, 10) || 1,
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
            placeholder="काम का विवरण"
          />

          <label>{t('address')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="साइट का पता / स्थान"
          />

          <div className="row">
            <div>
              <label>{t('date')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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

          <div className="row">
            <div>
              <label>{t('totalBudget')} (₹)</label>
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


export function PaymentPayModal({ booking, user, token, onClose, onSuccess, showToast, t }) {
  const [method, setMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const totalAmount = (booking?.agreed_rate || booking?.daily_rate || 500) * (booking?.days || 1);

  const handlePay = async () => {
    setLoading(true);
    try {
      const amountPaise = totalAmount * 100;
      const res = await api('/payments/order', 'POST', {
        booking_id: booking.id,
        amount_paise: amountPaise,
        method: method
      }, token);

      if (method === 'cash') {
        showToast('नकद भुगतान दर्ज किया गया। काम पूरा होने पर मिस्त्री को नकद दें।');
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Online Razorpay flow
      if (res.key_id && window.Razorpay) {
        const options = {
          key: res.key_id,
          amount: res.amount_paise,
          currency: 'INR',
          name: 'MistriBhaiya',
          description: `बुकिंग #${booking.id} एस्क्रो भुगतान`,
          order_id: res.order_id,
          handler: async (resp) => {
            try {
              await api('/payments/verify', 'POST', {
                payment_id: res.payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature
              }, token);
              showToast('भुगतान सफल! राशि एस्क्रो में सुरक्षित है 🔒');
              if (onSuccess) onSuccess();
              onClose();
            } catch (err) {
              showToast(err.message || 'सत्यापन विफल');
            }
          },
          prefill: { name: user?.name || '', contact: user?.phone || '' },
          theme: { color: '#2e7d32' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Dev mode: auto-verify mock payment
        await api('/payments/verify', 'POST', {
          payment_id: res.id,
          razorpay_order_id: res.gateway_order_id || `order_mock_${Date.now()}`,
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'sig_mock'
        }, token);
        showToast('भुगतान सफल! राशि एस्क्रो में सुरक्षित है 🔒');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      showToast(err.message || 'भुगतान प्रक्रिया में समस्या आई');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="sheet" style={{ maxWidth: '420px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1b5e20' }}>💳 अग्रिम / भुगतान</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>कुल राशि</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1b5e20' }}>₹{totalAmount}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            ({booking?.days || 1} दिन × ₹{booking?.agreed_rate || booking?.daily_rate || 500}/दिन)
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: method === 'online' ? '2px solid #2e7d32' : '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', background: method === 'online' ? '#e8f5e9' : '#fff' }}>
            <input type="radio" name="paymethod" checked={method === 'online'} onChange={() => setMethod('online')} />
            <div>
              <b style={{ color: '#1b5e20' }}>🔒 ऑनलाइन एस्क्रो (UPI / कार्ड)</b>
              <div style={{ fontSize: '12px', color: '#666' }}>काम पूरा होने तक राशि सुरक्षित रहेगी।</div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: method === 'cash' ? '2px solid #2e7d32' : '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', background: method === 'cash' ? '#e8f5e9' : '#fff' }}>
            <input type="radio" name="paymethod" checked={method === 'cash'} onChange={() => setMethod('cash')} />
            <div>
              <b style={{ color: '#333' }}>💵 नकद भुगतान</b>
              <div style={{ fontSize: '12px', color: '#666' }}>काम पूरा होने पर सीधे मिस्त्री को नकद दें।</div>
            </div>
          </label>
        </div>
        <button className="big" style={{ background: '#2e7d32', width: '100%' }} onClick={handlePay} disabled={loading}>
          {loading ? 'प्रक्रिया जारी है...' : (method === 'online' ? `₹${totalAmount} सुरक्षित भुगतान करें` : 'नकद विकल्प चुनें')}
        </button>
      </div>
    </div>
  );
}

export function PaymentReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  const gross = receipt.amount != null ? receipt.amount : 0;
  const fee = receipt.fee != null ? receipt.fee : 0;
  const net = receipt.net != null ? receipt.net : 0;
  const st = receipt.status || '';

  const getStatusLabel = (s) => {
    if (s === 'held') return '🔒 एस्क्रो में सुरक्षित';
    if (s === 'completed' || s === 'released') return '✅ भुगतान सफल';
    if (s === 'cash_pending') return '💵 नकद बाकी';
    if (s === 'cash_confirmed') return '✅ नकद प्राप्त';
    if (s === 'refunded') return '↩️ वापस किया';
    return s;
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="sheet" style={{ maxWidth: '420px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1b5e20' }}>🧾 भुगतान रसीद</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ textAlign: 'center', margin: '16px 0 14px' }}>
          <div style={{ fontSize: '36px' }}>
            {st === 'held' ? '🔒' : (st === 'completed' || st === 'released' || st === 'cash_confirmed') ? '✅' : '💵'}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#1b5e20', marginTop: '4px' }}>₹{gross}</div>
          <span style={{ fontSize: '12px', background: '#e8f5e9', padding: '3px 10px', borderRadius: '20px', display: 'inline-block', marginTop: '6px' }}>
            {getStatusLabel(st)}
          </span>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '14px', fontSize: '13px', lineHeight: '1.8', border: '1px solid #e9ecef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>रसीद ID:</span><b>#{receipt.id}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>माध्यम:</span><b style={{ textTransform: 'uppercase' }}>{receipt.method || 'online'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>ग्राहक:</span><b>{receipt.customer_name || '-'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>कारीगर:</span><b>{receipt.worker_name || '-'}</b>
          </div>
          <hr style={{ margin: '8px 0', border: 0, borderTop: '1px dashed #ced4da' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>कुल राशि:</span><span>₹{gross}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>प्लेटफ़ॉर्म शुल्क (5%):</span><span>₹{fee}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#1b5e20', fontSize: '14px', marginTop: '4px' }}>
            <span>कारीगर को शुद्ध:</span><span>₹{net}</span>
          </div>
          {receipt.created_at && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '10px', textAlign: 'center' }}>
              दिनांक: {new Date(receipt.created_at * 1000).toLocaleString('hi-IN')}
            </div>
          )}
        </div>
        <button className="big" style={{ marginTop: '16px', background: '#2e7d32' }} onClick={onClose}>बंद करें</button>
      </div>
    </div>
  );
}
