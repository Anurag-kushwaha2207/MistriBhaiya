import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorLedger({ token, showToast, t }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/ledger', 'GET', null, token);
      setLedger(res.ledger || []);
    } catch (err) {
      showToast(err.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [token]);

  return (
    <div>
      <div className="card">
        <h2>💰 {t('ledger')}</h2>
        <div className="sub">साथियों की मज़दूरी और हिसाब-किताब</div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="t">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('daysWorked')}</th>
              <th>{t('earned')}</th>
              <th>{t('advance')}</th>
              <th>{t('balance')}</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((item) => (
              <tr key={item.worker_id || item.name}>
                <td><b>{item.name}</b></td>
                <td>{item.days_worked || 0}</td>
                <td>₹{(item.total_earned || 0).toLocaleString('en-IN')}</td>
                <td>₹{(item.total_advance || 0).toLocaleString('en-IN')}</td>
                <td style={{ color: (item.balance || 0) > 0 ? 'var(--red)' : 'var(--g)', fontWeight: 'bold' }}>
                  ₹{(item.balance || 0).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
            {ledger.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>
                  कोई हिसाब उपलब्ध नहीं है
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

