import React, { useState, useRef, useEffect } from 'react';
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Completed work history state for worker
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Edit form state
  const [name, setName] = useState(user?.name || '');
  const [dailyRate, setDailyRate] = useState(profile?.daily_rate || '');
  const [exp, setExp] = useState(profile?.experience_years || '');
  const [village, setVillage] = useState(profile?.village || '');
  const [radius, setRadius] = useState(profile?.radius_km || 30);
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
  const allSkills = meta?.skills || [];
  const haveSkillsList = parseSkills(profile?.skills);

  // Load past completed jobs for the worker
  useEffect(() => {
    if (role === 'worker' && token) {
      setLoadingJobs(true);
      api('/bookings/mine', 'GET', null, token)
        .then(res => {
          const list = (res.bookings || []).filter(b => b.status === 'completed' || b.status === 'work_done');
          setCompletedJobs(list);
        })
        .catch(() => {})
        .finally(() => setLoadingJobs(false));
    }
  }, [role, token]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      showToast(lang === 'en' ? 'Processing photo...' : 'फोटो प्रोसेस हो रही है...');
      const base64Data = await compressAndResizeImage(file, 320, 0.82);
      const res = await api('/profile/avatar', 'POST', { avatar: base64Data }, token);
      const updatedUser = { ...user, avatar: res.avatar || base64Data };
      onUpdateUser(updatedUser);
      syncUser(updatedUser);
      showToast(t('photoUpdated') || 'फोटो सफलतापूर्वक अपडेट हो गई! 📷');
    } catch (err) {
      showToast(err.message || 'Photo upload failed');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      await api('/profile/avatar', 'DELETE', null, token);
      const updatedUser = { ...user, avatar: null };
      onUpdateUser(updatedUser);
      syncUser(updatedUser);
      showToast(t('saved') || 'फोटो हटा दी गई!');
    } catch (err) {
      showToast(err.message || 'Failed to remove photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      showToast('📍 लाइव GPS लोकेशन ले रहे हैं...');
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
      showToast(t('locok') || '📍 लोकेशन अपडेट हो गई!');
    } catch (err) {
      showToast(err.message || 'लोकेशन प्राप्त नहीं हो सकी');
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

      // Update role-specific profile
      let updatedProfile = { ...profile, lat: curLat, lng: curLng };
      if (role === 'worker') {
        const payload = {
          skills: selectedSkills,
          daily_rate: dailyRate ? parseInt(dailyRate, 10) : 0,
          experience_years: exp ? parseInt(exp, 10) : 0,
          village: village || '',
          radius_km: radius ? parseInt(radius, 10) : 30,
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
          radius_km: radius ? parseInt(radius, 10) : 30,
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

      showToast(t('saved') || 'प्रोफ़ाइल सुरक्षित हो गई! ✔');
      setIsEditing(false);
    } catch (err) {
      showToast(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm(t('confirmLogout') || 'क्या आप सचमुच लॉगआउट करना चाहते हैं?')) {
      onLogout();
      onClose();
    }
  };

  // Friendly location string resolution
  const friendlyLocation = profile?.lat != null
    ? (getFriendlyLocationName(profile.lat, profile.lng, lang) || getCityNameFromCoords(profile.lat, profile.lng))
    : (profile?.village || (lang === 'en' ? 'Etawah, Uttar Pradesh' : 'इटावा, उत्तर प्रदेश'));

  // Skills presets fallback if none yet selected
  const defaultSkillsList = ['Mason (Rajmistri)', 'Labour / Helper', 'Electrician', 'Plumber', 'Painter', 'Tiles Mistri', 'POP / Ceiling'];

  return (
    <div
      className="modal"
      id="profmodal"
      onClick={(e) => { if (e.target.id === 'profmodal') onClose(); }}
      style={{ zIndex: 100 }}
    >
      <div
        className="sheet"
        style={{
          position: 'relative',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: 0,
          borderRadius: '26px 26px 0 0',
          background: '#f8faf9',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)'
        }}
      >
        {/* =========================================================================
            1. FULL-WIDTH INDIAN CONSTRUCTION SITE COVER PHOTOGRAPH
        ========================================================================= */}
        <div style={{ position: 'relative', width: '100%', height: '175px', overflow: 'hidden', background: '#196126' }}>
          <img
            src="https://images.unsplash.com/photo-1541888946425-d0fbb18f86f6?auto=format&fit=crop&w=1200&q=80"
            alt="Construction Workforce"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          {/* Subtle dark gradient overlay for text readability & industrial aesthetic */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)'
            }}
          />

          {/* Top Brand Pill over Cover */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '14px',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.3px'
            }}
          >
            <i className="fa-solid fa-hard-hat" style={{ color: '#FFC32C' }}></i>
            MistriBhaiya Verified
          </div>

          {/* Close Button at top right */}
          <button
            onClick={onClose}
            type="button"
            title={t('close') || 'बंद करें'}
            style={{
              position: 'absolute',
              top: '12px',
              right: '14px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#fff',
              border: 'none',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}
          >
            ✕
          </button>
        </div>

        {/* =========================================================================
            2. WORKER PROFILE HEADER CARD (Overlaps the Cover Banner)
        ========================================================================= */}
        <div
          style={{
            position: 'relative',
            marginTop: '-36px',
            marginInline: '14px',
            background: '#ffffff',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08)',
            border: '1px solid #eef2ef',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Circular Worker Profile Photograph */}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    border: '2.5px solid #196126',
                    background: '#f1f8f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  title="फोटो बदलने के लिए क्लिक करें"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fa-regular fa-user" style={{ fontSize: '28px', color: '#196126' }}></i>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#196126',
                    color: '#fff',
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="फोटो बदलें"
                >
                  <i className="fa-solid fa-camera"></i>
                </button>
              </div>

              {/* Name & Role Badge */}
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    fontWeight: '800',
                    color: '#111827',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    lineHeight: '1.2'
                  }}
                >
                  {user?.name || (role === 'worker' ? 'SUNNY' : role === 'contractor' ? 'THEKEDAR' : 'CUSTOMER')}
                </h2>
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      background: '#e8f5e9',
                      color: '#196126',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      padding: '2.5px 9px',
                      borderRadius: '12px',
                      border: '1px solid #c8e6c9',
                      display: 'inline-block'
                    }}
                  >
                    {role === 'worker' ? 'Mistri / Labour' : role === 'contractor' ? 'Contractor / Thekedar' : 'Ghar Malik / Customer'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', fontWeight: '500' }}>
                  {role === 'worker' ? 'Worker Profile' : role === 'contractor' ? 'Contractor Profile' : 'Customer Profile'}
                </div>
              </div>
            </div>

            {/* Availability Status Badge (Top-Right) */}
            <div style={{ alignSelf: 'flex-start' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: profile?.status === 'free' || !profile?.status ? '#e8f5e9' : profile?.status === 'busy' ? '#fee2e2' : '#f3f4f6',
                  color: profile?.status === 'free' || !profile?.status ? '#196126' : profile?.status === 'busy' ? '#991b1b' : '#4b5563',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: `1px solid ${profile?.status === 'free' || !profile?.status ? '#a7f3d0' : profile?.status === 'busy' ? '#fca5a5' : '#e5e7eb'}`
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: profile?.status === 'free' || !profile?.status ? '#196126' : profile?.status === 'busy' ? '#dc2626' : '#6b7280'
                  }}
                />
                {profile?.status ? (profile.status === 'free' ? '● FREE' : profile.status === 'busy' ? '● BUSY' : '● OFFLINE') : '● FREE'}
              </span>
            </div>
          </div>

          {/* Profile Visibility Row */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px'
            }}
          >
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Profile visibility</span>
            <span
              style={{
                color: profile?.status === 'not_working' || profile?.status === 'busy' ? '#b45309' : '#196126',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className={profile?.status === 'not_working' || profile?.status === 'busy' ? 'fa-solid fa-clock text-amber-600' : 'fa-solid fa-circle-check text-green-600'} />
              {profile?.status === 'not_working' || profile?.status === 'busy' ? 'Currently busy / unavailable' : 'Available to customers'}
            </span>
          </div>

          {/* Hidden File Input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        </div>

        {/* =========================================================================
            EDIT PROFILE VIEW OR PROFILE DISPLAY VIEW
        ========================================================================= */}
        {isEditing ? (
          /* ================= EDIT MODE ================= */
          <div style={{ margin: '14px', background: '#fff', borderRadius: '20px', padding: '18px', border: '1px solid #eef2ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#196126', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-pencil"></i> {t('editProfile') || 'प्रोफ़ाइल विवरण बदलें'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ background: 'none', border: 'none', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕ रद्द
              </button>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                {t('name') || 'नाम'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="अपना पूरा नाम लिखें"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
              />
            </div>

            {/* Worker fields */}
            {role === 'worker' && (
              <>
                {/* Skills Checkbox Chips */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    {t('skills') || 'काम के हुनर (Skills)'}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {allSkills.map((s) => {
                      const isSelected = selectedSkills.includes(s.key);
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => handleToggleSkill(s.key)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: isSelected ? '1.5px solid #196126' : '1px solid #d1d5db',
                            background: isSelected ? '#e8f5e9' : '#ffffff',
                            color: isSelected ? '#196126' : '#4b5563',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✔ ' : ''}{s[lang] || s.key}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Wage */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    {t('rate') || 'दैनिक मजदूरी (Daily Wage ₹)'}
                  </label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    placeholder="उदा. 600"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                {/* Experience */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    {t('exp') || 'कार्य अनुभव (Experience Years)'}
                  </label>
                  <input
                    type="number"
                    value={exp}
                    onChange={(e) => setExp(e.target.value)}
                    placeholder="उदा. 3"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                {/* Village / Locality */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    {t('village') || 'गाँव / कस्बा / मोहल्ला (Village / Locality)'}
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="उदा. भरथना रोड, इटावा"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                {/* Work Travel Radius */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>
                      {t('radius') || 'काम के लिए कितनी दूर जा सकते हैं (Travel Radius)'}
                    </label>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#196126' }}>
                      {radius} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    style={{ width: '100%', accentColor: '#196126' }}
                  />
                </div>
              </>
            )}

            {/* Contractor fields */}
            {role === 'contractor' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    कंपनी / फर्म का नाम (Company Name)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="उदा. शर्मा कंस्ट्रक्शन"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    न्यूनतम बजट (Min Budget ₹)
                  </label>
                  <input
                    type="number"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="उदा. 25000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    गाँव / कस्बा / शहर (Locality)
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="उदा. इटावा"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>
              </>
            )}

            {/* Customer fields */}
            {role === 'customer' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                  घर का पता / मोहल्ला / गाँव
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="उदा. सिविल लाइन्स, इटावा"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
                />
              </div>
            )}

            {/* 3-Tier Cascading Location Selector */}
            <div style={{ marginTop: '14px' }}>
              <LocationPicker
                lat={editLat}
                lng={editLng}
                lang={lang}
                onLocationSelect={({ lat, lng }) => {
                  setEditLat(lat);
                  setEditLng(lng);
                }}
                village={village}
                onVillageChange={setVillage}
                onGpsClick={handleUpdateLocation}
                label={lang === 'en' ? '📍 Location (State ➔ District ➔ Tehsil)' : '📍 लोकेशन (राज्य ➔ ज़िला ➔ तहसील)'}
                showVillageInput={false}
              />
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#196126',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {isSaving ? 'सेव हो रहा है...' : '💾 सेव करें (Save Changes)'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                style={{
                  padding: '12px 18px',
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                रद्द करें
              </button>
            </div>
          </div>
        ) : (
          /* ================= DISPLAY MODE ================= */
          <div>
            {/* =========================================================================
                3. WORKER STATISTICS DASHBOARD (2x2 Grid)
            ========================================================================= */}
            {role === 'worker' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  margin: '14px 14px 0'
                }}
              >
                {/* 1. Daily Wage */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid #eef2ef',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-wallet"></i>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', lineHeight: '1.2' }}>
                    ₹{profile?.daily_rate || 600}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: '500', marginTop: '3px' }}>
                    Daily Wage
                  </div>
                </div>

                {/* 2. Experience */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid #eef2ef',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-regular fa-calendar-days"></i>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', lineHeight: '1.2' }}>
                    {profile?.experience_years != null && profile?.experience_years !== '' ? `${profile.experience_years} Years` : '3 Years'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: '500', marginTop: '3px' }}>
                    Experience
                  </div>
                </div>

                {/* 3. Rating */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid #eef2ef',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-regular fa-star"></i>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', lineHeight: '1.2' }}>
                    {(profile?.rating_avg || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: '500', marginTop: '3px' }}>
                    Rating ({profile?.rating_count || 0} reviews)
                  </div>
                </div>

                {/* 4. Jobs Completed */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid #eef2ef',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-briefcase"></i>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', lineHeight: '1.2' }}>
                    {profile?.jobs_done || completedJobs.length || 0}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: '500', marginTop: '3px' }}>
                    Jobs Completed
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Stats */}
            {role === 'contractor' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  margin: '14px 14px 0'
                }}
              >
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid #eef2ef' }}>
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-building"></i>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                    {profile?.company || 'Contractor'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '3px' }}>Company</div>
                </div>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid #eef2ef' }}>
                  <div style={{ color: '#196126', fontSize: '18px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-indian-rupee-sign"></i>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                    ₹{(profile?.min_budget || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '3px' }}>Min Budget</div>
                </div>
              </div>
            )}

            {/* =========================================================================
                4. PROFESSIONAL SKILLS SECTION
            ========================================================================= */}
            {(role === 'worker' || role === 'contractor') && (
              <div style={{ margin: '18px 14px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#111827', letterSpacing: '0.2px' }}>
                    Professional Skills
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#196126',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square"></i> एडिट
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(haveSkillsList.length > 0 ? haveSkillsList : defaultSkillsList).map((skillKey) => {
                    const found = allSkills.find((s) => s.key === skillKey);
                    const label = found ? (found[lang] || found.en || skillKey) : skillKey;
                    return (
                      <span
                        key={skillKey}
                        style={{
                          background: '#e8f5e9',
                          color: '#196126',
                          border: '1px solid #c8e6c9',
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                5. PERSONAL INFORMATION SECTION
            ========================================================================= */}
            <div
              style={{
                margin: '18px 14px 0',
                background: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #eef2ef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800', color: '#111827', letterSpacing: '0.2px' }}>
                Personal Information
              </h3>

              {/* Row 1: Mobile Number */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#e8f5e9',
                    color: '#196126',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  <i className="fa-solid fa-phone"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Mobile Number</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                    {user?.phone ? `+91 ${user.phone}` : 'Registered phone number'}
                  </div>
                </div>
              </div>

              {/* Row 2: Current Location */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#e8f5e9',
                    color: '#196126',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  <i className="fa-solid fa-location-dot"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Current Location</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                    {friendlyLocation}
                  </div>
                </div>
              </div>

              {/* Row 3: Work Travel Radius */}
              {role === 'worker' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: '#e8f5e9',
                      color: '#196126',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fa-solid fa-compass"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Work Travel Radius</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                      {profile?.radius_km || 30} km
                    </div>
                  </div>
                </div>
              )}

              {/* Row 4: Village / Locality */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingTop: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#e8f5e9',
                    color: '#196126',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  <i className="fa-solid fa-house-chimney"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Village / Locality</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                    {profile?.village || 'Registered locality'}
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                6. COMPLETED WORK HISTORY SECTION (Mistri Portfolio / Past Jobs)
            ========================================================================= */}
            {role === 'worker' && (
              <div
                style={{
                  margin: '18px 14px 0',
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '16px',
                  border: '1px solid #eef2ef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#196126' }}></i>
                    पहले किए गए काम (Work History)
                  </h3>
                  <span
                    style={{
                      fontSize: '11.5px',
                      background: '#e8f5e9',
                      color: '#196126',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '700'
                    }}
                  >
                    {completedJobs.length} काम पूरे
                  </span>
                </div>

                {loadingJobs ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                    लोड हो रहा है...
                  </div>
                ) : completedJobs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '18px 10px', color: '#9ca3af', fontSize: '13px' }}>
                    <div style={{ fontSize: '26px', marginBottom: '4px' }}>📋</div>
                    अभी तक कोई कार्य पूरा नहीं हुआ है। नए ऑर्डर स्वीकार करें और अपना रिकॉर्ड बनाएं!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedJobs.map((job) => {
                      const sObj = allSkills.find((s) => s.key === job.skill);
                      const sLabel = sObj ? (sObj[lang] || sObj.en || job.skill) : (job.skill || 'Construction');
                      return (
                        <div
                          key={job.id}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#111827' }}>
                              {sLabel}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '2px' }}>
                              👤 {job.customer_name || 'ग्राहक'} · 📅 {job.start_date || 'पूर्ण'}
                            </div>
                            {job.rating && (
                              <div style={{ fontSize: '12px', color: '#d97706', fontWeight: '700', marginTop: '3px' }}>
                                ⭐ {job.rating}/5 {job.review ? `"${job.review}"` : ''}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#196126' }}>
                              ₹{job.agreed_rate || job.daily_rate || 0}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#10b981', fontWeight: '700' }}>
                              ✅ पूरा हुआ
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                7. ACTION BUTTONS (Edit Profile, Update Location, Logout)
            ========================================================================= */}
            <div style={{ margin: '20px 14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Edit Profile Details */}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#196126',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(25,97,38,0.25)',
                  transition: 'background 0.2s'
                }}
              >
                <i className="fa-solid fa-pencil"></i>
                Edit Profile Details
              </button>

              {/* Update My Location */}
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: '#e8f5e9',
                  color: '#196126',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-location-crosshairs"></i>
                Update My Location
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogoutClick}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: '#C92525',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(201,37,37,0.2)'
                }}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                Logout
              </button>
            </div>

            {/* Bottom downward close icon button */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '20px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#111827',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                title={t('close') || 'बंद करें'}
              >
                <i className="fa-solid fa-arrow-down"></i>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. UPDATE LOCATION MODAL / DRAWER (3-TIER HIERARCHY)
        ========================================================================= */}
        {showLocationModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                background: '#ffffff',
                borderRadius: '24px 24px 0 0',
                padding: '20px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#196126', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-location-dot"></i>
                  {lang === 'en' ? 'Update Location' : 'अपनी लोकेशन अपडेट करें'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 3-Tier State -> District -> Tehsil Selector */}
              <LocationPicker
                lat={editLat}
                lng={editLng}
                lang={lang}
                onLocationSelect={({ lat, lng }) => {
                  setEditLat(lat);
                  setEditLng(lng);
                }}
                village={village}
                onVillageChange={setVillage}
                onGpsClick={handleUpdateLocation}
                label={lang === 'en' ? '📍 State ➔ District ➔ Tehsil' : '📍 राज्य ➔ ज़िला ➔ तहसील'}
                showVillageInput={true}
              />

              <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveProfile();
                    setShowLocationModal(false);
                  }}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '13px',
                    background: '#196126',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {isSaving ? 'सेव हो रहा है...' : '✔ लोकेशन सेव करें'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  style={{
                    padding: '13px 18px',
                    background: '#f3f4f6',
                    color: '#4b5563',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  रद्द करें
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
