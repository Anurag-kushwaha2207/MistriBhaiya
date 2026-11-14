import React, { useState, useEffect } from 'react';
import { STATES_ALL, getFriendlyLocationName } from '../data/locations';

export default function LocationPicker({
  lat,
  lng,
  onLocationSelect,
  village = '',
  onVillageChange,
  onGpsClick,
  label,
  lang = 'hi',
  showVillageInput = true
}) {
  const isEn = lang === 'en';

  const [selectedStateKey, setSelectedStateKey] = useState('');
  const [selectedDistKey, setSelectedDistKey] = useState('');
  const [selectedTehsilKey, setSelectedTehsilKey] = useState('');

  // Find districts for chosen state
  const stateObj = STATES_ALL.find((s) => s.key === selectedStateKey);
  const districtList = stateObj ? stateObj.districts : [];

  // Find tehsils for chosen district
  const districtObj = districtList.find((d) => d.key === selectedDistKey);
  const tehsilList = (districtObj && districtObj.tehsils) ? districtObj.tehsils : [];

  const handleStateChange = (stateKey) => {
    setSelectedStateKey(stateKey);
    setSelectedDistKey('');
    setSelectedTehsilKey('');
  };

  const handleDistrictChange = (distKey) => {
    setSelectedDistKey(distKey);
    setSelectedTehsilKey('');
    const dist = districtList.find((d) => d.key === distKey);
    if (dist && dist.lat != null && dist.lng != null && onLocationSelect) {
      const sName = isEn ? stateObj.en : stateObj.hi;
      const dName = isEn ? dist.en : dist.hi;
      onLocationSelect({
        lat: dist.lat,
        lng: dist.lng,
        text: `${dName}, ${sName}`
      });
    }
  };

  const handleTehsilChange = (tehName) => {
    setSelectedTehsilKey(tehName);
    const teh = tehsilList.find((t) => (t.en === tehName || t.hi === tehName));
    if (teh && teh.lat != null && teh.lng != null && onLocationSelect) {
      const sName = isEn ? stateObj.en : stateObj.hi;
      const dName = isEn ? districtObj.en : districtObj.hi;
      const tName = isEn ? teh.en : teh.hi;
      onLocationSelect({
        lat: teh.lat,
        lng: teh.lng,
        text: `${tName}, ${dName} (${sName})`
      });
    }
  };

  const defaultLabel = isEn ? '📍 Select Location' : '📍 लोकेशन चुनें';
  const displayLabel = label || defaultLabel;
  const currentDisplay = getFriendlyLocationName(lat, lng, lang) || (isEn ? 'Location not selected yet' : 'लोकेशन अभी चुनी नहीं गई है');

  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#f8faf8',
        borderRadius: '12px',
        border: '1.5px solid #d4e5d4',
        margin: '12px 0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#1b5e20', margin: 0 }}>
          {displayLabel} *
        </label>
        {onGpsClick && (
          <button
            type="button"
            className="sec"
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              background: '#e8f5e9',
              color: '#2e7d32',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={onGpsClick}
          >
            {isEn ? '📡 Live GPS' : '📡 लाइव GPS'}
          </button>
        )}
      </div>

      <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>
        {isEn
          ? 'Select your State, District and Tehsil in order:'
          : 'क्रम से अपना राज्य, ज़िला और तहसील चुनें:'}
      </div>

      {/* 1. State Selector */}
      <div style={{ marginBottom: '8px' }}>
        <select
          value={selectedStateKey}
          onChange={(e) => handleStateChange(e.target.value)}
          style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce', width: '100%' }}
        >
          <option value="">
            {isEn ? '-- 1. Select State / UT --' : '-- 1. पहले राज्य चुनें --'}
          </option>
          {STATES_ALL.map((s) => (
            <option key={s.key} value={s.key}>
              🏛️ {isEn ? s.en : s.hi}
            </option>
          ))}
        </select>
      </div>

      {/* 2. District Selector */}
      {selectedStateKey && (
        <div style={{ marginBottom: '8px' }}>
          <select
            value={selectedDistKey}
            onChange={(e) => handleDistrictChange(e.target.value)}
            style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce', width: '100%' }}
          >
            <option value="">
              {isEn ? '-- 2. Select District --' : '-- 2. अब ज़िला चुनें --'}
            </option>
            {districtList.map((d) => (
              <option key={d.key} value={d.key}>
                📍 {isEn ? d.en : d.hi}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Tehsil Selector */}
      {selectedDistKey && tehsilList.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <select
            value={selectedTehsilKey}
            onChange={(e) => handleTehsilChange(e.target.value)}
            style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce', width: '100%' }}
          >
            <option value="">
              {isEn ? '-- 3. Select Tehsil / Area (Optional) --' : '-- 3. तहसील / क्षेत्र चुनें (वैकल्पिक) --'}
            </option>
            {tehsilList.map((t, idx) => (
              <option key={idx} value={isEn ? t.en : t.hi}>
                🏘️ {isEn ? t.en : t.hi}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active selection feedback */}
      <div
        style={{
          background: lat != null ? '#e8f5e9' : '#fffde7',
          border: lat != null ? '1px solid #a5d6a7' : '1px solid #fff59d',
          borderRadius: '8px',
          padding: '8px 10px',
          margin: '8px 0',
          fontSize: '12px',
          color: lat != null ? '#1b5e20' : '#b78103',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>📍</span>
        <span>
          {isEn ? 'Selected Location: ' : 'चुनी हुई लोकेशन: '}
          <b>{currentDisplay}</b>
        </span>
      </div>

      {/* 4. Optional Village / Mohalla Input */}
      {showVillageInput && onVillageChange && (
        <div style={{ marginTop: '8px' }}>
          <label style={{ fontSize: '12px', color: '#555', marginBottom: '3px', display: 'block' }}>
            {isEn ? 'Village / Locality / Street:' : 'गाँव / मोहल्ला / गली:'}
          </label>
          <input
            type="text"
            value={village}
            onChange={(e) => onVillageChange(e.target.value)}
            placeholder={isEn ? 'e.g. Sector 62 / Main Market / Ward 4' : 'उदा. गढ़ी, मेन मार्केट, वार्ड 4'}
            style={{ padding: '8px 10px', fontSize: '13px', borderRadius: '8px', width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}
