import React, { useState, useEffect } from 'react';
import { STATES_DATA, getFriendlyLocationName } from '../data/locations';

export default function LocationPicker({
  lat,
  lng,
  onLocationSelect,
  village = '',
  onVillageChange,
  onGpsClick,
  label = '📍 लोकेशन चुनें (Location)',
  showVillageInput = true
}) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTehsil, setSelectedTehsil] = useState('');

  // Find districts for chosen state
  const stateObj = STATES_DATA.find((s) => s.name === selectedState);
  const districtList = stateObj ? stateObj.districts : [];

  // Find tehsils for chosen district
  const districtObj = districtList.find((d) => d.name === selectedDistrict);
  const tehsilList = districtObj ? districtObj.tehsils : [];

  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    setSelectedDistrict('');
    setSelectedTehsil('');
  };

  const handleDistrictChange = (distName) => {
    setSelectedDistrict(distName);
    setSelectedTehsil('');
    const dist = districtList.find((d) => d.name === distName);
    if (dist && dist.lat != null && dist.lng != null && onLocationSelect) {
      onLocationSelect({
        lat: dist.lat,
        lng: dist.lng,
        text: `${dist.name.split(' (')[0]}, ${selectedState.split(' (')[0]}`
      });
    }
  };

  const handleTehsilChange = (tehsilName) => {
    setSelectedTehsil(tehsilName);
    const teh = tehsilList.find((t) => t.name === tehsilName);
    if (teh && teh.lat != null && teh.lng != null && onLocationSelect) {
      const locText = `${teh.name.split(' (')[0]}, ${selectedDistrict.split(' (')[0]} (${selectedState.split(' (')[0]})`;
      onLocationSelect({
        lat: teh.lat,
        lng: teh.lng,
        text: locText
      });
    }
  };

  const currentDisplay = getFriendlyLocationName(lat, lng) || 'लोकेशन अभी चुनी नहीं गई है';

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
          {label} *
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
            📡 लाइव GPS
          </button>
        )}
      </div>

      <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>
        क्रम से अपना राज्य, जिला और तहसील चुनें:
      </div>

      {/* 1. State Selector */}
      <div style={{ marginBottom: '8px' }}>
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
          style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce' }}
        >
          <option value="">-- 1. पहले राज्य (State) चुनें --</option>
          {STATES_DATA.map((s) => (
            <option key={s.name} value={s.name}>
              🏛️ {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. District Selector (Appears when state is chosen) */}
      {selectedState && (
        <div style={{ marginBottom: '8px' }}>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce' }}
          >
            <option value="">-- 2. अब जिला (District) चुनें --</option>
            {districtList.map((d) => (
              <option key={d.name} value={d.name}>
                📍 {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Tehsil Selector (Appears when district is chosen) */}
      {selectedDistrict && (
        <div style={{ marginBottom: '8px' }}>
          <select
            value={selectedTehsil}
            onChange={(e) => handleTehsilChange(e.target.value)}
            style={{ padding: '9px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ced6ce' }}
          >
            <option value="">-- 3. अब अपनी तहसील (Tehsil) चुनें --</option>
            {tehsilList.map((t) => (
              <option key={t.name} value={t.name}>
                🏘️ {t.name}
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
          चुनी हुई लोकेशन: <b>{currentDisplay}</b>
        </span>
      </div>

      {/* 4. Optional Village / Mohalla Input */}
      {showVillageInput && onVillageChange && (
        <div style={{ marginTop: '8px' }}>
          <label style={{ fontSize: '12px', color: '#555', marginBottom: '3px', display: 'block' }}>
            गाँव / मोहल्ला / गली (Village / Locality / Street):
          </label>
          <input
            type="text"
            value={village}
            onChange={(e) => onVillageChange(e.target.value)}
            placeholder="उदा. गढ़ी, मेन मार्केट, वार्ड 4"
            style={{ padding: '8px 10px', fontSize: '13px', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
}

