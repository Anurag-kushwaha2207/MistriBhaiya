import React, { useState, useRef } from 'react';
import { api, getLoc, compressAndResizeImage } from '../api';
import { syncUser, syncWorkerProfile, syncContractorProfile } from '../firebase';

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

  const handleUpdateLocation = async () => {
    try {
      showToast("📍 लोकेशन ले रहे हैं...");
      const loc = await getLoc(true);
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
      let curLat = profile?.lat;
      let curLng = profile?.lng;
      if (curLat == null || curLng == null) {
        try {
          const loc = await getLoc(false);
          curLat = loc?.lat;
          curLng = loc?.lng;
        } catch (e) {}
      }
      if (curLat == null || curLng == null) {
        curLat = 26.4505;
        curLng = 80.1912;
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

            <div style={{ marginTop: '14px', padding: '10px', background: '#f5f7f5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--mut)', display: 'block' }}>लोकेशन (GPS)</span>
                <b style={{ fontSize: '13px', color: profile?.lat != null ? 'var(--g)' : 'var(--red)' }}>
                  {profile?.lat != null ? `📍 ${Number(profile.lat).toFixed(3)}, ${Number(profile.lng).toFixed(3)}` : '❌ सेट नहीं'}
                </b>
              </div>
              <button
                type="button"
                className="sec"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={handleUpdateLocation}
              >
                📍 GPS लें
              </button>
            </div>

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
              <div className="info-cell">
                <div className="sub">लोकेशन (GPS)</div>
                <div className="val" style={{ fontSize: '12px' }}>
                  {profile?.lat != null ? `${Number(profile.lat).toFixed(3)}, ${Number(profile.lng).toFixed(3)}` : '❌ सेट नहीं'}
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

