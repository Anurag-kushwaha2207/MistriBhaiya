import React, { useState } from 'react';
import { api } from '../api';
import { syncUser } from '../firebase';

export default function LoginView({ onLoginSuccess, showToast, t }) {
  const [role, setRole] = useState('worker');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast(t('reqd') + ': ' + t('phone'));
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/request-otp', 'POST', { phone: cleanPhone });
      setOtpSent(true);
      if (res.dev_otp) {
        setOtp(String(res.dev_otp));
        showToast(`${t('devotp')}: ${res.dev_otp}`);
      } else {
        showToast(t('getotp') + ' ' + t('saved'));
      }
    } catch (err) {
      showToast(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || !otp) {
      showToast(t('reqd') + ': ' + t('otp'));
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/verify-otp', 'POST', {
        phone: cleanPhone,
        otp: otp.trim(),
        role,
        name: name.trim() || undefined
      });
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      showToast(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickPhone = (p, r) => {
    setPhone(p);
    setRole(r);
    setOtp('1234');
    setOtpSent(true);
  };

  return (
    <div className="card" style={{ maxWidth: '480px', margin: '20px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', margin: '8px 0 4px' }}>🏗️ MistriBhaiya</h2>
        <div className="sub">गाँव और शहर के हर घर को आस-पास का फ्री मिस्त्री / मज़दूर</div>
      </div>

      <label>{t('iam')}</label>
      <div className="row" style={{ marginBottom: '14px' }}>
        <button
          type="button"
          className={role === 'worker' ? '' : 'sec'}
          style={{ padding: '10px 4px', fontSize: '13px' }}
          onClick={() => setRole('worker')}
        >
          👷 {t('worker')}
        </button>
        <button
          type="button"
          className={role === 'customer' ? '' : 'sec'}
          style={{ padding: '10px 4px', fontSize: '13px' }}
          onClick={() => setRole('customer')}
        >
          🏠 {t('customer')}
        </button>
        <button
          type="button"
          className={role === 'contractor' ? '' : 'sec'}
          style={{ padding: '10px 4px', fontSize: '13px' }}
          onClick={() => setRole('contractor')}
        >
          🏗️ {t('contractor')}
        </button>
      </div>

      <label>{t('phone')}</label>
      <input
        type="tel"
        maxLength="10"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="9876543210"
      />

      <label>{t('name')} <span className="sub">({t('optional') || 'नये यूजर के लिए'})</span></label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="उदा. रमेश कुमार"
      />

      <div style={{ margin: '14px 0' }}>
        <button
          className="big"
          type="button"
          onClick={handleRequestOtp}
          disabled={loading}
        >
          {loading ? 'कृपया रुकें…' : t('getotp')}
        </button>
      </div>

      {otpSent && (
        <div style={{ borderTop: '1px dashed #ccc', paddingTop: '14px', marginTop: '10px' }}>
          <label>{t('otp')}</label>
          <input
            type="number"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="1234"
          />

          <div style={{ margin: '14px 0 6px' }}>
            <button
              className="big"
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? 'लॉगिन हो रहा है…' : `✔ ${t('verify')}`}
            </button>
          </div>
        </div>
      )}

      {/* Quick Demo Test Buttons */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '12px' }}>
        <div className="sub" style={{ marginBottom: '6px' }}>⚡ <b>टेस्ट अकाउंट्स (1-क्लिक लॉगिन):</b></div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543210', 'worker')}
          >
            👷 रमेश (मिस्त्री)
          </button>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543220', 'customer')}
          >
            🏠 अमित (ग्राहक)
          </button>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543230', 'contractor')}
          >
            🏗️ शर्मा कंस्ट्रक्शन
          </button>
        </div>
      </div>
    </div>
  );
}

