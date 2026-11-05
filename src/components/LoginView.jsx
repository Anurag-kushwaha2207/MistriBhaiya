import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { syncUser } from '../firebase';

export default function LoginView({ onLoginSuccess, showToast, t }) {
  // Mode: 'phone' | 'existing_password' | 'existing_otp' | 'new_register' | 'forgot_password'
  const [mode, setMode] = useState('phone');
  const [phone, setPhone] = useState('');
  const [existingUser, setExistingUser] = useState(null); // { name, role, has_password }

  // Form inputs
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState('worker');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clean 10-digit phone
  const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);

  // Auto-check phone when 10 digits are entered
  const checkPhoneStatus = async (p = cleanPhone) => {
    if (p.length < 10) return;
    setLoading(true);
    try {
      const res = await api('/auth/check-phone', 'POST', { phone: p });
      if (res.exists) {
        setExistingUser(res);
        setRole(res.role || 'customer');
        if (res.has_password) {
          setMode('existing_password');
        } else {
          setMode('existing_otp');
        }
      } else {
        setExistingUser(null);
        setMode('new_register');
      }
    } catch (err) {
      showToast(err.message || 'फोन नंबर चेक करने में समस्या');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e) => {
    if (e) e.preventDefault();
    if (cleanPhone.length !== 10) {
      showToast(t('reqd') + ': 10-अंकों का मोबाइल नंबर');
      return;
    }
    checkPhoneStatus(cleanPhone);
  };

  // 1. Existing user: Password Login
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      showToast('कृपया पासवर्ड दर्ज करें');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/login-password', 'POST', {
        phone: cleanPhone,
        password: password
      });
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      showToast(err.message || 'लॉगिन विफल (गलत पासवर्ड)');
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP (for new register, existing otp login, or forgot password)
  const handleRequestOtp = async () => {
    if (cleanPhone.length !== 10) {
      showToast(t('reqd') + ': ' + t('phone'));
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/request-otp', 'POST', { phone: cleanPhone });
      setOtpSent(true);
      if (res.dev_otp) {
        setOtp(String(res.dev_otp));
        showToast(`${t('devotp') || 'टेस्ट OTP'}: ${res.dev_otp}`);
      } else {
        showToast('OTP आपके मोबाइल पर भेज दिया गया है');
      }
    } catch (err) {
      showToast(err.message || 'OTP भेजने में विफल');
    } finally {
      setLoading(false);
    }
  };

  // 3. New User Registration: Verify OTP + Name + Password + Role
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      showToast('कृपया OTP दर्ज करें');
      return;
    }
    if (!name.trim()) {
      showToast('कृपया अपना नाम दर्ज करें');
      return;
    }
    if (password && password.length < 4) {
      showToast('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/verify-otp', 'POST', {
        phone: cleanPhone,
        otp: otp.trim(),
        role,
        name: name.trim(),
        password: password ? password.trim() : undefined
      });
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      showToast(err.message || 'रजिस्ट्रेशन विफल');
    } finally {
      setLoading(false);
    }
  };

  // 4. Existing User OTP Login
  const handleOtpLogin = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      showToast('कृपया OTP दर्ज करें');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/verify-otp', 'POST', {
        phone: cleanPhone,
        otp: otp.trim(),
        role: existingUser?.role || role
      });
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      showToast(err.message || 'OTP वेरिफिकेशन विफल');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password: Verify OTP + New Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      showToast('कृपया OTP दर्ज करें');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showToast('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('दोनों पासवर्ड मेल नहीं खाते');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/forgot-password', 'POST', {
        phone: cleanPhone,
        otp: otp.trim(),
        new_password: newPassword.trim()
      });
      showToast('पासवर्ड सफलतापूर्वक बदल गया!');
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      showToast(err.message || 'पासवर्ड बदलने में विफल');
    } finally {
      setLoading(false);
    }
  };

  // Reset to phone input
  const resetToPhone = () => {
    setMode('phone');
    setExistingUser(null);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp('');
    setOtpSent(false);
  };

  // Quick fill test account
  const fillQuickPhone = (p) => {
    setPhone(p);
    setMode('phone');
    checkPhoneStatus(p);
  };

  const roleLabel = (r) => {
    if (r === 'worker') return '👷 मिस्त्री / मज़दूर';
    if (r === 'customer') return '🏠 घर मालिक';
    if (r === 'contractor') return '🏗️ ठेकेदार';
    return r;
  };

  return (
    <div className="card" style={{ maxWidth: '440px', margin: '20px auto', padding: '22px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', margin: '4px 0 2px' }}>🏗️ MistriBhaiya</h2>
        <div className="sub" style={{ fontSize: '13px' }}>गाँव और शहर के हर घर को आस-पास का फ्री मिस्त्री / मज़दूर</div>
      </div>

      {/* ---------------- MODE 1: PHONE INPUT ---------------- */}
      {mode === 'phone' && (
        <form onSubmit={handlePhoneSubmit}>
          <label style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            📱 अपना 10-अंकों का मोबाइल नंबर दर्ज करें
          </label>
          <input
            type="tel"
            maxLength="10"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPhone(val);
              if (val.length === 10) {
                checkPhoneStatus(val);
              }
            }}
            placeholder="9876543210"
            style={{ fontSize: '16px', letterSpacing: '1px', textAlign: 'center', fontWeight: 'bold' }}
            autoFocus
          />

          <div style={{ margin: '14px 0 6px' }}>
            <button
              className="big"
              type="submit"
              disabled={loading || cleanPhone.length !== 10}
            >
              {loading ? 'चेक हो रहा है…' : 'आगे बढ़ें ➔'}
            </button>
          </div>
        </form>
      )}

      {/* ---------------- MODE 2: EXISTING USER - PASSWORD LOGIN ---------------- */}
      {mode === 'existing_password' && (
        <form onSubmit={handlePasswordLogin}>
          <div style={{ background: '#eef6ee', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #c8e6c9' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
              नमस्ते, {existingUser?.name || 'साथी'}! 👋
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
              नंबर: <b>{cleanPhone}</b> ({roleLabel(existingUser?.role)})
            </div>
          </div>

          <label style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            🔒 अपना पासवर्ड दर्ज करें
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ fontSize: '15px', paddingRight: '40px' }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <button
              className="big"
              type="submit"
              disabled={loading || !password}
              style={{ background: '#2e7d32' }}
            >
              {loading ? 'लॉगिन हो रहा है…' : '✔ लॉगिन करें'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px' }}>
            <button
              type="button"
              className="sec"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                setMode('forgot_password');
                setOtp('');
                setOtpSent(false);
                handleRequestOtp();
              }}
            >
              🔑 पासवर्ड भूल गए?
            </button>
            <button
              type="button"
              className="sec"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                setMode('existing_otp');
                setOtp('');
                setOtpSent(false);
                handleRequestOtp();
              }}
            >
              📲 OTP से लॉगिन
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={resetToPhone}
            >
              ← दूसरा नंबर दर्ज करें
            </button>
          </div>
        </form>
      )}

      {/* ---------------- MODE 3: EXISTING USER - OTP LOGIN ---------------- */}
      {mode === 'existing_otp' && (
        <form onSubmit={handleOtpLogin}>
          <div style={{ background: '#eef6ee', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
              नमस्ते, {existingUser?.name || 'साथी'}! 👋
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
              नंबर: <b>{cleanPhone}</b> पर OTP सत्यापन
            </div>
          </div>

          {!otpSent ? (
            <div style={{ margin: '14px 0' }}>
              <button
                className="big"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                {loading ? 'कृपया रुकें…' : '📲 OTP भेजें'}
              </button>
            </div>
          ) : (
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                ✉️ 6-अंकों का OTP दर्ज करें
              </label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold' }}
                autoFocus
              />

              <div style={{ margin: '14px 0 10px' }}>
                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp}
                >
                  {loading ? 'सत्यापित हो रहा है…' : '✔ OTP से लॉगिन करें'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--g)', fontSize: '12px', cursor: 'pointer' }}
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  🔄 OTP दोबारा भेजें
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={resetToPhone}
            >
              ← वापस जाएं
            </button>
          </div>
        </form>
      )}

      {/* ---------------- MODE 4: NEW USER REGISTRATION ---------------- */}
      {mode === 'new_register' && (
        <form onSubmit={handleRegister}>
          <div style={{ background: '#fff9c4', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #fff176' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#795548' }}>
              ✨ नया अकाउंट बनाएं
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              मोबाइल: <b>{cleanPhone}</b> (एक नंबर पर एक ही अकाउंट)
            </div>
          </div>

          <label style={{ fontWeight: 'bold', marginBottom: '6px' }}>आप क्या हैं? (Role)</label>
          <div className="row" style={{ marginBottom: '12px' }}>
            <button
              type="button"
              className={role === 'worker' ? '' : 'sec'}
              style={{ padding: '9px 4px', fontSize: '12px' }}
              onClick={() => setRole('worker')}
            >
              👷 मिस्त्री / मज़दूर
            </button>
            <button
              type="button"
              className={role === 'customer' ? '' : 'sec'}
              style={{ padding: '9px 4px', fontSize: '12px' }}
              onClick={() => setRole('customer')}
            >
              🏠 घर मालिक
            </button>
            <button
              type="button"
              className={role === 'contractor' ? '' : 'sec'}
              style={{ padding: '9px 4px', fontSize: '12px' }}
              onClick={() => setRole('contractor')}
            >
              🏗️ ठेकेदार
            </button>
          </div>

          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            👤 आपका पूरा नाम <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="उदा. रमेश कुमार"
            style={{ marginBottom: '12px' }}
            required
          />

          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            🔒 अपना पासवर्ड बनाएं <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="कम से कम 4 अक्षर (उदा. 1234)"
              style={{ fontSize: '14px', paddingRight: '40px' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>

          {!otpSent ? (
            <div style={{ margin: '14px 0' }}>
              <button
                className="big"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || !name.trim() || !password}
              >
                {loading ? 'कृपया रुकें…' : '📲 OTP भेजें'}
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '12px', marginTop: '10px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                ✉️ OTP दर्ज करें
              </label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '12px' }}
                autoFocus
              />

              <div style={{ margin: '10px 0' }}>
                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp || !name.trim()}
                  style={{ background: '#2e7d32' }}
                >
                  {loading ? 'रजिस्टर हो रहा है…' : '✔ अकाउंट बनाएं और लॉगिन करें'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--g)', fontSize: '12px', cursor: 'pointer' }}
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  🔄 OTP दोबारा भेजें
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={resetToPhone}
            >
              ← दूसरा नंबर दर्ज करें
            </button>
          </div>
        </form>
      )}

      {/* ---------------- MODE 5: FORGOT PASSWORD ---------------- */}
      {mode === 'forgot_password' && (
        <form onSubmit={handleResetPassword}>
          <div style={{ background: '#ffebee', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #ffcdd2' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c62828' }}>
              🔑 नया पासवर्ड सेट करें
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              नंबर: <b>{cleanPhone}</b> पर OTP सत्यापन
            </div>
          </div>

          {!otpSent ? (
            <div style={{ margin: '14px 0' }}>
              <button
                className="big"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                {loading ? 'कृपया रुकें…' : '📲 OTP भेजें'}
              </button>
            </div>
          ) : (
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>✉️ 6-अंकों का OTP</label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', fontSize: '16px', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '10px' }}
                autoFocus
              />

              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔒 नया पासवर्ड</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="कम से कम 4 अक्षर"
                style={{ marginBottom: '10px' }}
              />

              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔒 नया पासवर्ड दोबारा दर्ज करें</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="वही पासवर्ड दोबारा लिखें"
                style={{ marginBottom: '14px' }}
              />

              <div style={{ margin: '12px 0 8px' }}>
                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp || !newPassword || !confirmPassword}
                  style={{ background: '#2e7d32' }}
                >
                  {loading ? 'बदल रहा है…' : '✔ पासवर्ड बदलें और लॉगिन करें'}
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setMode('existing_password')}
            >
              ← वापस लॉगिन पर जाएं
            </button>
          </div>
        </form>
      )}

      {/* Quick Demo Test Buttons */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '12px' }}>
        <div className="sub" style={{ marginBottom: '6px' }}>⚡ <b>टेस्ट अकाउंट्स (1-क्लिक टेस्ट):</b></div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543210')}
          >
            👷 रमेश (मिस्त्री)
          </button>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543220')}
          >
            🏠 अमित (ग्राहक)
          </button>
          <button
            type="button"
            className="sec"
            style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => fillQuickPhone('9876543230')}
          >
            🏗️ शर्मा कंस्ट्रक्शन
          </button>
        </div>
      </div>
    </div>
  );
}
