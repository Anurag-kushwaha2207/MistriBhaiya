import React, { useState } from 'react';
import { api, getLoc, setLocCache } from '../api';
import { syncUser, syncWorkerProfile, syncContractorProfile } from '../firebase';
import { CITIES, getCityNameFromCoords } from './ProfileModal';

const DEFAULT_SKILLS = [
  { key: 'rajmistri', hi: 'राजमिस्त्री', en: 'Mason' },
  { key: 'labour', hi: 'मज़दूर / हेल्पर', en: 'Labour / Helper' },
  { key: 'plumber', hi: 'प्लम्बर', en: 'Plumber' },
  { key: 'electrician', hi: 'इलेक्ट्रिशियन', en: 'Electrician' },
  { key: 'painter', hi: 'पेंटर', en: 'Painter' },
  { key: 'carpenter', hi: 'बढ़ई', en: 'Carpenter' },
  { key: 'tiles', hi: 'टाइल्स मिस्त्री', en: 'Tiles Mason' },
  { key: 'welder', hi: 'वेल्डर', en: 'Welder' },
  { key: 'pop', hi: 'POP / सीलिंग', en: 'POP / False Ceiling' },
  { key: 'bar_bender', hi: 'सरिया / बार बेंडर', en: 'Bar Bender' }
];

export default function LoginView({ onLoginSuccess, meta, lang = 'hi', showToast, t }) {
  // Views: 'login' | 'register' | 'forgot' | 'otp_login'
  const [view, setView] = useState('login');

  // Shared / Login state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP state (for register, forgot, or otp_login)
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Forgot password state
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');

  // Register full form state
  const [role, setRole] = useState('worker');
  const [name, setName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [selectedSkills, setSelectedSkills] = useState(['rajmistri']);
  const [dailyRate, setDailyRate] = useState('600');
  const [exp, setExp] = useState('3');
  const [village, setVillage] = useState('');
  const [radius, setRadius] = useState(10);
  const [company, setCompany] = useState('');
  const [minBudget, setMinBudget] = useState('15000');
  const [regLat, setRegLat] = useState(null);
  const [regLng, setRegLng] = useState(null);

  const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);

  const skillsList = meta?.skills?.length ? meta.skills : DEFAULT_SKILLS;

  const toggleSkill = (k) => {
    setSelectedSkills(prev =>
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
  };

  const handleSelectCity = (cityName) => {
    const found = CITIES.find(c => c.name === cityName);
    if (found) {
      setRegLat(found.lat);
      setRegLng(found.lng);
      setLocCache({ lat: found.lat, lng: found.lng });
      showToast(`📍 लोकेशन सेट: ${found.name}`);
    }
  };

  const handleFetchGps = async () => {
    setLoading(true);
    try {
      const loc = await getLoc(true);
      setRegLat(loc.lat);
      setRegLng(loc.lng);
      setLocCache(loc);
      const name = getCityNameFromCoords(loc.lat, loc.lng);
      showToast(`📍 सटीक GPS लोकेशन मिली: ${name}`);
    } catch (e) {
      showToast('GPS अनुमति नहीं मिली। कृपया लिस्ट से अपना शहर चुनें।');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 1. Password Login
  // -------------------------------------------------------------
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (cleanPhone.length !== 10) {
      showToast('कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!password) {
      showToast('कृपया अपना पासवर्ड दर्ज करें');
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
      if (res.user.role === 'worker' && res.profile) {
        syncWorkerProfile(res.user.id, res.profile);
      } else if (res.user.role === 'contractor' && res.profile) {
        syncContractorProfile(res.user.id, res.profile);
      }
      onLoginSuccess(res.token, res.user, res.profile);
    } catch (err) {
      showToast(err.message || 'लॉगिन विफल (गलत नंबर या पासवर्ड)');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Request OTP
  // -------------------------------------------------------------
  const handleRequestOtp = async () => {
    if (cleanPhone.length !== 10) {
      showToast('कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/request-otp', 'POST', { phone: cleanPhone });
      setOtpSent(true);
      if (res.dev_otp) {
        setOtp(String(res.dev_otp));
        showToast(`टेस्ट OTP: ${res.dev_otp}`);
      } else {
        showToast('OTP आपके मोबाइल पर भेज दिया गया है');
      }
    } catch (err) {
      showToast(err.message || 'OTP भेजने में विफल');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. New User Full Registration
  // -------------------------------------------------------------
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (cleanPhone.length !== 10) {
      showToast('कृपया 10-अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!name.trim()) {
      showToast('कृपया अपना पूरा नाम दर्ज करें');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      showToast('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('दोनों पासवर्ड मेल नहीं खाते');
      return;
    }
    if (!otp) {
      showToast('कृपया मोबाइल पर आया OTP दर्ज करें');
      return;
    }
    if (role === 'worker' && selectedSkills.length === 0) {
      showToast('कृपया कम से कम एक काम / हुनर चुनें');
      return;
    }
    if ((role === 'worker' || role === 'contractor') && (regLat == null || regLng == null)) {
      showToast('कृपया GPS ऑन करें या अपना शहर / लोकेशन चुनें (Location is required)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        phone: cleanPhone,
        otp: otp.trim(),
        role: role,
        name: name.trim(),
        password: regPassword.trim(),
        lat: regLat,
        lng: regLng,
        village: village.trim()
      };

      if (role === 'worker') {
        payload.skills = selectedSkills;
        payload.daily_rate = parseInt(dailyRate) || 0;
        payload.experience_years = parseInt(exp) || 0;
        payload.radius_km = parseFloat(radius) || 10;
      } else if (role === 'contractor') {
        payload.company = company.trim();
        payload.skills = selectedSkills;
        payload.min_budget = parseInt(minBudget) || 0;
        payload.experience_years = parseInt(exp) || 0;
      }

      const res = await api('/auth/verify-otp', 'POST', payload);
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      if (res.user.role === 'worker' && res.profile) {
        syncWorkerProfile(res.user.id, res.profile);
      } else if (res.user.role === 'contractor' && res.profile) {
        syncContractorProfile(res.user.id, res.profile);
      }
      showToast('🎉 अकाउंट सफलतापूर्वक बन गया!');
      onLoginSuccess(res.token, res.user, res.profile);
    } catch (err) {
      showToast(err.message || 'रजिस्ट्रेशन विफल');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Forgot Password Reset
  // -------------------------------------------------------------
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      showToast('कृपया OTP दर्ज करें');
      return;
    }
    if (!forgotNewPw || forgotNewPw.length < 4) {
      showToast('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
      return;
    }
    if (forgotNewPw !== forgotConfirmPw) {
      showToast('दोनों पासवर्ड मेल नहीं खाते');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/auth/forgot-password', 'POST', {
        phone: cleanPhone,
        otp: otp.trim(),
        new_password: forgotNewPw.trim()
      });
      showToast('पासवर्ड सफलतापूर्वक बदल गया!');
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user, res.profile);
    } catch (err) {
      showToast(err.message || 'पासवर्ड बदलने में विफल');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. OTP Login
  // -------------------------------------------------------------
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
        role: 'customer'
      });
      localStorage.setItem('ks_token', res.token);
      syncUser(res.user);
      onLoginSuccess(res.token, res.user, res.profile);
    } catch (err) {
      showToast(err.message || 'OTP लॉगिन विफल');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '460px', margin: '20px auto', padding: '22px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 style={{ fontSize: '24px', margin: '2px 0 3px' }}>🏗️ MistriBhaiya</h2>
        <div className="sub" style={{ fontSize: '13px' }}>गाँव और शहर के हर घर को आस-पास का फ्री मिस्त्री / मज़दूर</div>
      </div>

      {/* ========================================================= */}
      {/* 1. LOGIN VIEW (DEFAULT)                                    */}
      {/* ========================================================= */}
      {view === 'login' && (
        <form onSubmit={handleLogin}>
          <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            📱 मोबाइल नंबर (Mobile Number)
          </label>
          <input
            type="tel"
            maxLength="10"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="उदा. 9876543210"
            style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px' }}
            autoFocus
          />

          <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            🔒 पासवर्ड (Password)
          </label>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ fontSize: '15px', paddingRight: '42px' }}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '13px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#c62828', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              onClick={() => {
                setView('forgot');
                setOtp('');
                setOtpSent(false);
              }}
            >
              🔑 पासवर्ड भूल गए?
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2e7d32', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              onClick={() => {
                setView('otp_login');
                setOtp('');
                setOtpSent(false);
              }}
            >
              📲 OTP से लॉगिन
            </button>
          </div>

          <div style={{ margin: '14px 0 16px' }}>
            <button
              className="big"
              type="submit"
              disabled={loading || cleanPhone.length !== 10 || !password}
              style={{ background: '#2e7d32' }}
            >
              {loading ? 'कृपया रुकें…' : '✔ लॉगिन करें'}
            </button>
          </div>

          {/* New User Register CTA */}
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e0e0e0', marginTop: '16px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>क्या आप नए यूज़र हैं? </span>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#2e7d32',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 4px'
              }}
              onClick={() => {
                setView('register');
                setOtp('');
                setOtpSent(false);
              }}
            >
              👉 नया अकाउंट बनाएं (Register Here)
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* 2. REGISTER VIEW (NEW USER REGISTRATION)                   */}
      {/* ========================================================= */}
      {view === 'register' && (
        <form onSubmit={handleRegister}>
          <div style={{ background: '#eef6ee', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #c8e6c9' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
              ✨ नया अकाउंट बनाएं (New Registration)
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
              एक नंबर पर एक ही अकाउंट। पूरी प्रोफ़ाइल जानकारी भरें ताकि ग्राहक / साथी आपसे जुड़ सकें।
            </div>
          </div>

          {/* Role selector */}
          <label style={{ fontWeight: 'bold', marginBottom: '6px' }}>मैं हूँ (Choose Role) *</label>
          <div className="row" style={{ marginBottom: '14px' }}>
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

          {/* Personal info */}
          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>आपका पूरा नाम (Full Name) *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="उदा. रमेश कुमार"
            style={{ marginBottom: '12px' }}
            required
          />

          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>मोबाइल नंबर (10 Digits) *</label>
          <input
            type="tel"
            maxLength="10"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            style={{ marginBottom: '12px', fontWeight: 'bold' }}
            required
          />

          {/* Location details */}
          <div style={{ padding: '12px', background: '#f5f7f5', borderRadius: '8px', border: '1px solid #e0e7e0', marginBottom: '14px' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
              📍 शहर / लोकेशन चुनें (City / Location) *
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select
                value={getCityNameFromCoords(regLat, regLng) || ''}
                onChange={(e) => handleSelectCity(e.target.value)}
                style={{ flex: 1, padding: '8px', fontSize: '13px' }}
              >
                <option value="">-- शहर चुनें (Delhi, Noida, Lucknow, etc.) --</option>
                {CITIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="sec"
                style={{ padding: '8px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={handleFetchGps}
              >
                📡 लाइव GPS
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--g)' }}>
              चुनी लोकेशन: <b>📍 {getCityNameFromCoords(regLat, regLng)}</b>
            </div>

            <label style={{ fontWeight: 'bold', margin: '10px 0 4px', display: 'block' }}>
              गाँव / मोहल्ला / पता (Village / Area)
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="उदा. सेक्टर 62 / गढ़ी / चौक"
              style={{ marginBottom: '0' }}
            />
          </div>

          {/* Worker specific profile fields */}
          {role === 'worker' && (
            <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', marginBottom: '14px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
                🛠️ आपका काम / स्किल्स (कम से कम एक चुनें) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {skillsList.map(s => (
                  <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(s.key)}
                      onChange={() => toggleSkill(s.key)}
                    />
                    {s[lang] || s.key}
                  </label>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>दिन की मज़दूरी (₹)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    placeholder="600"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>अनुभव (साल)</label>
                  <input
                    type="number"
                    value={exp}
                    onChange={(e) => setExp(e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>

              <label style={{ fontWeight: 'bold', fontSize: '12px' }}>
                काम करने का दायरा: <b>{radius} कि.मी.</b>
              </label>
              <input
                type="range"
                min="2"
                max="30"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
          )}

          {/* Contractor specific profile fields */}
          {role === 'contractor' && (
            <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', marginBottom: '14px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                🏢 कंपनी / फ़र्म का नाम
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="उदा. जय बजरंग कंस्ट्रक्शन"
                style={{ marginBottom: '10px' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>न्यूनतम बजट (₹)</label>
                  <input
                    type="number"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>अनुभव (साल)</label>
                  <input
                    type="number"
                    value={exp}
                    onChange={(e) => setExp(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password fields */}
          <div style={{ padding: '12px', background: '#f5f7f5', borderRadius: '8px', border: '1px solid #e0e7e0', marginBottom: '14px' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
              🔒 अपना पासवर्ड बनाएं * (कम से कम 4 अक्षर)
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="उदा. 1234 या secret"
              style={{ marginBottom: '10px' }}
              required
            />

            <label style={{ fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
              🔒 पासवर्ड दोबारा लिखें (Confirm Password) *
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="वही पासवर्ड दोबारा लिखें"
              style={{ marginBottom: '4px' }}
              required
            />
          </div>

          {/* OTP Section */}
          <div style={{ borderTop: '1px dashed #ccc', paddingTop: '12px', marginBottom: '16px' }}>
            {!otpSent ? (
              <button
                type="button"
                className="big"
                onClick={handleRequestOtp}
                disabled={loading || cleanPhone.length !== 10 || !name.trim() || !regPassword}
              >
                {loading ? 'कृपया रुकें…' : '📲 मोबाइल पर OTP भेजें'}
              </button>
            ) : (
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  ✉️ मोबाइल पर आया 6-अंकों का OTP दर्ज करें *
                </label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '10px' }}
                  autoFocus
                />

                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--g)', fontSize: '12px', cursor: 'pointer' }}
                    onClick={handleRequestOtp}
                    disabled={loading}
                  >
                    🔄 OTP दोबारा भेजें
                  </button>
                </div>

                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp}
                  style={{ background: '#2e7d32' }}
                >
                  {loading ? 'अकाउंट बन रहा है…' : '✔ अकाउंट बनाएं और लॉगिन करें'}
                </button>
              </div>
            )}
          </div>

          {/* Back to Login link */}
          <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid #eee' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>पहले से अकाउंट है? </span>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setView('login');
                setOtp('');
                setOtpSent(false);
              }}
            >
              लॉगिन करें (Login Here)
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* 3. FORGOT PASSWORD VIEW                                    */}
      {/* ========================================================= */}
      {view === 'forgot' && (
        <form onSubmit={handleResetPassword}>
          <div style={{ background: '#ffebee', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #ffcdd2' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c62828' }}>
              🔑 पासवर्ड रीसेट करें (Reset Password)
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              अपने रजिस्टर्ड मोबाइल नंबर पर OTP प्राप्त करके नया पासवर्ड बनाएं।
            </div>
          </div>

          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>मोबाइल नंबर (10 Digits)</label>
          <input
            type="tel"
            maxLength="10"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            style={{ marginBottom: '12px', fontWeight: 'bold' }}
            autoFocus
          />

          {!otpSent ? (
            <div style={{ margin: '14px 0' }}>
              <button
                className="big"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || cleanPhone.length !== 10}
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

              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔒 नया पासवर्ड (New Password)</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={forgotNewPw}
                onChange={(e) => setForgotNewPw(e.target.value)}
                placeholder="कम से कम 4 अक्षर"
                style={{ marginBottom: '10px' }}
              />

              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔒 नया पासवर्ड दोबारा दर्ज करें</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={forgotConfirmPw}
                onChange={(e) => setForgotConfirmPw(e.target.value)}
                placeholder="वही पासवर्ड दोबारा लिखें"
                style={{ marginBottom: '14px' }}
              />

              <div style={{ margin: '14px 0 10px' }}>
                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp || !forgotNewPw || !forgotConfirmPw}
                  style={{ background: '#2e7d32' }}
                >
                  {loading ? 'बदल रहा है…' : '✔ पासवर्ड बदलें और लॉगिन करें'}
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setView('login');
                setOtp('');
                setOtpSent(false);
              }}
            >
              ← वापस लॉगिन पर जाएं
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* 4. OTP LOGIN VIEW                                          */}
      {/* ========================================================= */}
      {view === 'otp_login' && (
        <form onSubmit={handleOtpLogin}>
          <div style={{ background: '#eef6ee', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
              📲 OTP से लॉगिन
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
              बिना पासवर्ड के सीधे मोबाइल OTP से लॉगिन करें।
            </div>
          </div>

          <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>मोबाइल नंबर (10 Digits)</label>
          <input
            type="tel"
            maxLength="10"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            style={{ marginBottom: '12px', fontWeight: 'bold' }}
            autoFocus
          />

          {!otpSent ? (
            <div style={{ margin: '14px 0' }}>
              <button
                className="big"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || cleanPhone.length !== 10}
              >
                {loading ? 'कृपया रुकें…' : '📲 OTP भेजें'}
              </button>
            </div>
          ) : (
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '4px' }}>✉️ 6-अंकों का OTP दर्ज करें</label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '10px' }}
                autoFocus
              />

              <div style={{ margin: '14px 0 10px' }}>
                <button
                  className="big"
                  type="submit"
                  disabled={loading || !otp}
                >
                  {loading ? 'लॉगिन हो रहा है…' : '✔ लॉगिन करें'}
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
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setView('login');
                setOtp('');
                setOtpSent(false);
              }}
            >
              ← वापस पासवर्ड लॉगिन पर जाएं
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
