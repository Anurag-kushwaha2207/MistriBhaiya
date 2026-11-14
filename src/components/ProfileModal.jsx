import React, { useState, useRef } from 'react';
import { api, getLoc, compressAndResizeImage } from '../api';
import { syncUser, syncWorkerProfile, syncContractorProfile } from '../firebase';
import LocationPicker from './LocationPicker';
import { getFriendlyLocationName } from '../data/locations';

export const CITIES = [
  { name: 'दिल्ली (Delhi / NCR)', lat: 28.6139, lng: 77.2090 },
  { name: 'नोएडा (Noida)', lat: 28.5355, lng: 77.3910 },
  { name: 'ग्रेटर नोएडा (Greater Noida)', lat: 28.4744, lng: 77.5040 },
  { name: 'गाजियाबाद (Ghaziabad)', lat: 28.6692, lng: 77.4538 },
  { name: 'गुरुग्राम / गुड़गांव (Gurugram)', lat: 28.4595, lng: 77.0266 },
  { name: 'फरीदाबाद (Faridabad)', lat: 28.4089, lng: 77.3178 },
  { name: 'लखनऊ (Lucknow)', lat: 26.8467, lng: 80.9462 },
  { name: 'कानपुर (Kanpur)', lat: 26.4499, lng: 80.3319 },
  { name: 'प्रयागराज / इलाहाबाद (Prayagraj)', lat: 25.4358, lng: 81.8463 },
  { name: 'वाराणसी / बनारस (Varanasi)', lat: 25.3176, lng: 82.9739 },
  { name: 'गोरखपुर (Gorakhpur)', lat: 26.7606, lng: 83.3732 },
  { name: 'आगरा (Agra)', lat: 27.1767, lng: 78.0081 },
  { name: 'मेरठ (Meerut)', lat: 28.9845, lng: 77.7064 },
  { name: 'बरेली (Bareilly)', lat: 28.3670, lng: 79.4304 },
  { name: 'अलीगढ़ (Aligarh)', lat: 27.8974, lng: 78.0880 },
  { name: 'मुरादाबाद (Moradabad)', lat: 28.8386, lng: 78.7733 },
  { name: 'सहारनपुर (Saharanpur)', lat: 29.9678, lng: 77.5460 },
  { name: 'झांसी (Jhansi)', lat: 25.4484, lng: 78.5685 },
  { name: 'अयोध्या (Ayodhya)', lat: 26.7922, lng: 82.1998 },
  { name: 'पटना (Patna)', lat: 25.5941, lng: 85.1376 },
  { name: 'गया (Gaya)', lat: 24.7914, lng: 85.0002 },
  { name: 'मुज़फ़्फ़रपुर (Muzaffarpur)', lat: 26.1209, lng: 85.3647 },
  { name: 'भागलपुर (Bhagalpur)', lat: 25.2425, lng: 86.9842 },
  { name: 'दरभंगा (Darbhanga)', lat: 26.1542, lng: 85.8918 },
  { name: 'भोपाल (Bhopal)', lat: 23.2599, lng: 77.4126 },
  { name: 'इंदौर (Indore)', lat: 22.7196, lng: 75.8577 },
  { name: 'ग्वालियर (Gwalior)', lat: 26.2183, lng: 78.1828 },
  { name: 'जबलपुर (Jabalpur)', lat: 23.1815, lng: 79.9864 },
  { name: 'उज्जैन (Ujjain)', lat: 23.1765, lng: 75.7885 },
  { name: 'जयपुर (Jaipur)', lat: 26.9124, lng: 75.7873 },
  { name: 'जोधपुर (Jodhpur)', lat: 26.2389, lng: 73.0243 },
  { name: 'कोटा (Kota)', lat: 25.2138, lng: 75.8648 },
  { name: 'उदयपुर (Udaipur)', lat: 24.5854, lng: 73.7125 },
  { name: 'रांची (Ranchi)', lat: 23.3441, lng: 85.3096 },
  { name: 'जमशेदपुर (Jamshedpur)', lat: 22.8046, lng: 86.2029 },
  { name: 'धनबाद (Dhanbad)', lat: 23.7957, lng: 86.4304 },
  { name: 'मुंबई (Mumbai)', lat: 19.0760, lng: 72.8777 },
  { name: 'पुणे (Pune)', lat: 18.5204, lng: 73.8567 },
  { name: 'अहमदाबाद (Ahmedabad)', lat: 23.0225, lng: 72.5714 },
  { name: 'सूरत (Surat)', lat: 21.1702, lng: 72.8311 },
  { name: 'कोलकाता (Kolkata)', lat: 22.5726, lng: 88.3639 },
  { name: 'चंडीगढ़ (Chandigarh)', lat: 30.7333, lng: 76.7794 },
  { name: 'देहरादून (Dehradun)', lat: 30.3165, lng: 78.0322 },
  { name: 'हरिद्वार (Haridwar)', lat: 29.9457, lng: 78.1642 },
  { name: 'रायपुर (Raipur)', lat: 21.2514, lng: 81.6296 }
];

export function getCityNameFromCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  let closest = null;
  let minDist = 999999;
  for (const c of CITIES) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  }
  if (minDist < 0.6) {
    return closest.name;
  }
  return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
}

export default function ProfileModal({
  user,
  profile,
  meta,
  lang,
  token,
  onClose,
  onUpdateUser,
  onUpdateProfile,
  onLogout,
  showToast,
  t
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Edit form state
  const [name, setName] = useState(user?.name || '');
  const [dailyRate, setDailyRate] = useState(profile?.daily_rate || '');
  const [exp, setExp] = useState(profile?.experience_years || '');
  const [village, setVillage] = useState(profile?.village || '');
  const [radius, setRadius] = useState(profile?.radius_km || 6);
  const [company, setCompany] = useState(profile?.company || '');
  const [minBudget, setMinBudget] = useState(profile?.min_budget || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [editLat, setEditLat] = useState(profile?.lat ?? null);
  const [editLng, setEditLng] = useState(profile?.lng ?? null);

  const parseSkills = (s) => {
    if (!s) return [];
    if (Array.isArray(s)) return s;
    return String(s).split(',').map(x => x.trim()).filter(Boolean);
  };

  const [selectedSkills, setSelectedSkills] = useState(parseSkills(profile?.skills));
  const fileInputRef = useRef(null);

  const role = user?.role || 'worker';
  const roleLabel = role === 'worker' ? `👷 ${t('worker')}` : (role === 'customer' ? `🏠 ${t('customer')}` : `🏗️ ${t('contractor')}`);
  const roleColor = role === 'worker' ? '#2e7d32' : (role === 'customer' ? '#1565c0' : '#e65100');

  const handlePhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      showToast("फोटो प्रोसेस हो रही है...");
      const base64Data = await compressAndResizeImage(file, 320, 0.82);
      const res = await api('/profile/avatar', 'POST', { avatar: base64Data }, token);
      const updatedUser = { ...user, avatar: res.avatar || base64Data };
      onUpdateUser(updatedUser);
      syncUser(updatedUser);
      showToast(t('photoUpdated'));
    } catch (err) {
      showToast(err.message || "Photo upload failed");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      await api('/profile/avatar', 'DELETE', null, token);
      const updatedUser = { ...user, avatar: null };
      onUpdateUser(updatedUser);
      syncUser(updatedUser);
      showToast(t('saved'));
    } catch (err) {
      showToast(err.message || "Failed to remove photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectCity = async (cityName) => {
    const found = CITIES.find(c => c.name === cityName);
    if (!found) return;
    setEditLat(found.lat);
    setEditLng(found.lng);
    try {
      if (role === 'worker') {
        await api('/worker/location', 'POST', { lat: found.lat, lng: found.lng }, token);
      } else if (role === 'contractor') {
        await api('/contractor/location', 'POST', { lat: found.lat, lng: found.lng }, token);
      }
      const updatedProfile = { ...profile, lat: found.lat, lng: found.lng };
      onUpdateProfile(updatedProfile);
      if (role === 'worker') syncWorkerProfile(user.id, updatedProfile);
      if (role === 'contractor') syncContractorProfile(user.id, updatedProfile);
      showToast(`📍 ${found.name} सेट हो गया!`);
    } catch (e) {}
  };

  const handleUpdateLocation = async () => {
    try {
      showToast("📍 लाइव GPS लोकेशन ले रहे हैं...");
      const loc = await getLoc(true);
      setEditLat(loc.lat);
      setEditLng(loc.lng);
      if (role === 'worker') {
        await api('/worker/location', 'POST', { lat: loc.lat, lng: loc.lng }, token);
      } else if (role === 'contractor') {
        await api('/contractor/location', 'POST', { lat: loc.lat, lng: loc.lng }, token);
      }
      const updatedProfile = { ...profile, lat: loc.lat, lng: loc.lng };
      onUpdateProfile(updatedProfile);
      if (role === 'worker') syncWorkerProfile(user.id, updatedProfile);
      if (role === 'contractor') syncContractorProfile(user.id, updatedProfile);
      showToast(t('locok') || "लोकेशन अपडेट हो गई!");
    } catch (err) {
      showToast(err.message || "लोकेशन प्राप्त नहीं हो सकी");
    }
  };

  const handleToggleSkill = (skillKey) => {
    if (selectedSkills.includes(skillKey)) {
      setSelectedSkills(selectedSkills.filter(k => k !== skillKey));
    } else {
      setSelectedSkills([...selectedSkills, skillKey]);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      // Update name
      if (name && name !== user.name) {
        await api('/profile', 'PUT', { name }, token);
        const updatedUser = { ...user, name };
        onUpdateUser(updatedUser);
        syncUser(updatedUser);
      }

      // Resolve coordinates safely
      let curLat = editLat != null ? editLat : profile?.lat;
      let curLng = editLng != null ? editLng : profile?.lng;
      if (curLat == null || curLng == null) {
        try {
          const loc = await getLoc(false);
          curLat = loc?.lat;
          curLng = loc?.lng;
        } catch (e) {}
      }
      if (curLat == null || curLng == null) {
        // Do NOT silently default to Delhi. Require the user to set a location explicitly.
        showToast('कृपया पहले अपनी लोकेशन सेट करें — GPS बटन दबाएं या शहर चुनें।');
        setLoading(false);
        return;
      }

      // Update role-specific profile
      let updatedProfile = { ...profile, lat: curLat, lng: curLng };
      if (role === 'worker') {
        const payload = {
          skills: selectedSkills,
          daily_rate: dailyRate ? parseInt(dailyRate, 10) : 0,
          experience_years: exp ? parseInt(exp, 10) : 0,
          village: village || '',
          radius_km: radius ? parseInt(radius, 10) : 6,
          lat: curLat,
          lng: curLng
        };
        const r = await api('/worker/profile', 'PUT', payload, token);
        updatedProfile = { ...updatedProfile, ...r.profile, ...payload };
        onUpdateProfile(updatedProfile);
        syncWorkerProfile(user.id, updatedProfile);
      } else if (role === 'contractor') {
        const payload = {
          company: company || '',
          skills: selectedSkills,
          min_budget: minBudget ? parseInt(minBudget, 10) : 0,
          about: about || '',
          experience_years: exp ? parseInt(exp, 10) : 0,
          village: village || '',
          radius_km: radius ? parseInt(radius, 10) : 25,
          lat: curLat,
          lng: curLng
        };
        const r = await api('/contractor/profile', 'PUT', payload, token);
        updatedProfile = { ...updatedProfile, ...r.profile, ...payload };
        onUpdateProfile(updatedProfile);
        syncContractorProfile(user.id, updatedProfile);
      } else if (role === 'customer') {
        const payload = { village: village || '' };
        await api('/profile', 'PUT', payload, token);
        updatedProfile = { ...updatedProfile, village };
        onUpdateProfile(updatedProfile);
      }

      showToast(t('saved'));
      setIsEditing(false);
    } catch (err) {
      showToast(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm(t('confirmLogout'))) {
      onLogout();
      onClose();
    }
  };

  const allSkills = meta?.skills || [];
  const haveSkillsList = parseSkills(profile?.skills);

  return (
    <div className="modal" id="profmodal" onClick={(e) => { if (e.target.id === 'profmodal') onClose(); }}>
      <div className="sheet" style={{ position: 'relative', maxHeight: '92vh', overflowY: 'auto', padding: '18px' }}>
        <button className="close-btn" onClick={onClose} title={t('close')}>×</button>

        {/* Avatar Section */}
        <div className="avatar-wrap">
          <div className="avatar-lg">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div style={{ marginTop: '8px' }}>
            <span className="pill" style={{ background: roleColor }}>{roleLabel}</span>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              className="sec"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={isUploadingPhoto}
            >
              📷 {t('changePhoto')}
            </button>
            {user?.avatar && (
              <button
                className="warn"
                style={{ fontSize: '12px', padding: '6px 10px' }}
                onClick={handleRemovePhoto}
                disabled={isUploadingPhoto}
              >
                🗑️ {t('removePhoto')}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Content Body: Edit or View */}
        {isEditing ? (
          <div>
            <h3 style={{ margin: '0 0 10px', borderBottom: '1px solid #e0e0e0', paddingBottom: '6px' }}>
              ✏️ {t('editProfile')}
            </h3>

            <label>{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name')}
            />

            {role === 'worker' && (
              <>
                <label>{t('skills')}</label>
                <div className="chk">
                  {allSkills.map((s) => (
                    <label key={s.key}>
                      <input
                        type="checkbox"
                        value={s.key}
                        checked={selectedSkills.includes(s.key)}
                        onChange={() => handleToggleSkill(s.key)}
                      />
                      {s[lang] || s.key}
                    </label>
                  ))}
                </div>

                <label>{t('rate')}</label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                />

                <label>{t('exp')}</label>
                <input
                  type="number"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />

                <label>{t('village')}</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />

                <label>
                  {t('radius')}: <b>{radius}</b> {t('km')}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </>
            )}

            {role === 'contractor' && (
              <>
                <label>{t('company')}</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />

                <label>{t('skills')}</label>
                <div className="chk">
                  {allSkills.map((s) => (
                    <label key={s.key}>
                      <input
                        type="checkbox"
                        value={s.key}
                        checked={selectedSkills.includes(s.key)}
                        onChange={() => handleToggleSkill(s.key)}
                      />
                      {s[lang] || s.key}
                    </label>
                  ))}
                </div>

                <label>{t('minBudget')}</label>
                <input
                  type="number"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                />

                <label>{t('about')}</label>
                <textarea
                  rows="2"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                />
              </>
            )}

            {role === 'customer' && (
              <>
                <label>{t('village')}</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </>
            )}

            {/* 3-Tier Cascading Location Selector */}
            <LocationPicker
              lat={editLat}
              lng={editLng}
              onLocationSelect={({ lat, lng }) => {
                setEditLat(lat);
                setEditLng(lng);
              }}
              village={village}
              onVillageChange={setVillage}
              onGpsClick={handleUpdateLocation}
              label="📍 लोकेशन (राज्य ➔ जिला ➔ तहसील)"
              showVillageInput={false}
            />

            <div className="profile-actions" style={{ marginTop: '16px' }}>
              <button className="big" onClick={handleSaveProfile} disabled={isSaving}>
                💾 {t('saveChanges')}
              </button>
              <button className="big sec" onClick={() => setIsEditing(false)} disabled={isSaving}>
                {t('cancelEdit')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: '2px 0 4px', fontSize: '22px' }}>{user?.name || t('profile')}</h2>
              <span className="sub">📱 {user?.phone || '-'}</span>
            </div>

            {/* User Info */}
            <h4 style={{ margin: '14px 0 6px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              {t('userInfo')}
            </h4>
            <div className="info-grid">
              <div className="info-cell">
                <div className="sub">{t('phone')}</div>
                <div className="val">{user?.phone || '-'}</div>
              </div>
              <div className="info-cell">
                <div className="sub">{t('iam')}</div>
                <div className="val">{roleLabel}</div>
              </div>
              <div className="info-cell">
                <div className="sub">{t('status')}</div>
                <div className="val">
                  {profile?.status ? (
                    <span className={`pill ${profile.status === 'free' ? 'free' : profile.status === 'busy' ? 'busy' : 'offline'}`}>
                      {t('s_' + profile.status)}
                    </span>
                  ) : '● एक्टिव'}
                </div>
              </div>
              <div className="info-cell" style={{ gridColumn: 'span 2' }}>
                <div className="sub">📍 शहर / लोकेशन (GPS)</div>
                <div className="val" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: profile?.lat != null ? 'var(--g)' : 'var(--red)' }}>
                    {profile?.lat != null ? `📍 ${getFriendlyLocationName(profile.lat, profile.lng) || getCityNameFromCoords(profile.lat, profile.lng)}` : '❌ सेट नहीं'}
                  </span>
                  <button
                    type="button"
                    className="sec"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={handleUpdateLocation}
                  >
                    📡 GPS अपडेट
                  </button>
                </div>
              </div>
            </div>

            {/* Role Details */}
            <h4 style={{ margin: '14px 0 6px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              {t('workInfo')}
            </h4>
            {role === 'worker' && (
              <div className="info-grid">
                <div className="info-cell" style={{ gridColumn: 'span 2' }}>
                  <div className="sub">{t('skills')}</div>
                  <div className="val skills" style={{ marginTop: '4px' }}>
                    {haveSkillsList.length > 0 ? haveSkillsList.map(k => {
                      const found = allSkills.find(s => s.key === k);
                      return <span key={k}>{found ? found[lang] : k}</span>;
                    }) : <span className="sub">कोई स्किल नहीं चुनी</span>}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('rate')}</div>
                  <div className="val">₹{profile?.daily_rate || 0} / {t('daySfx') || 'दिन'}</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('exp')}</div>
                  <div className="val">{profile?.experience_years || 0} वर्ष</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('village')}</div>
                  <div className="val">{profile?.village || '-'}</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('radius')}</div>
                  <div className="val">{profile?.radius_km || 6} {t('km')}</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('rating')}</div>
                  <div className="val">⭐ {(profile?.rating_avg || 0).toFixed(1)} ({profile?.rating_count || 0})</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('jobsDone')}</div>
                  <div className="val">✅ {profile?.jobs_done || 0}</div>
                </div>
              </div>
            )}

            {role === 'contractor' && (
              <div className="info-grid">
                <div className="info-cell" style={{ gridColumn: 'span 2' }}>
                  <div className="sub">{t('company')}</div>
                  <div className="val">{profile?.company || '-'}</div>
                </div>
                <div className="info-cell" style={{ gridColumn: 'span 2' }}>
                  <div className="sub">{t('skills')}</div>
                  <div className="val skills" style={{ marginTop: '4px' }}>
                    {haveSkillsList.length > 0 ? haveSkillsList.map(k => {
                      const found = allSkills.find(s => s.key === k);
                      return <span key={k}>{found ? found[lang] : k}</span>;
                    }) : <span className="sub">कोई स्किल नहीं</span>}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('minBudget')}</div>
                  <div className="val">₹{(profile?.min_budget || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="info-cell">
                  <div className="sub">{t('rating')}</div>
                  <div className="val">⭐ {(profile?.rating_avg || 0).toFixed(1)}</div>
                </div>
              </div>
            )}

            {role === 'customer' && (
              <div className="info-grid">
                <div className="info-cell" style={{ gridColumn: 'span 2' }}>
                  <div className="sub">{t('village')}</div>
                  <div className="val">{profile?.village || '-'}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="profile-actions" style={{ marginTop: '16px', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="sec" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>
                  ✏️ {t('editProfile')}
                </button>
                <button className="sec" style={{ flex: 1 }} onClick={handleUpdateLocation}>
                  📍 {t('setloc')}
                </button>
              </div>
              <button className="warn" style={{ width: '100%', marginTop: '6px' }} onClick={handleLogoutClick}>
                🚪 {t('logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

