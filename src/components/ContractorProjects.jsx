import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorProjects({ token, onOpenCounter, onOpenChat, onStartCall, showToast, t }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'requested' | 'active' | 'completed'
  const [assignModalProject, setAssignModalProject] = useState(null);
  const [crewList, setCrewList] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/projects', 'GET', null, token);
      setProjects(res.projects || []);
    } catch (err) {
      showToast(err.message || "प्रोजेक्ट लोड करने में विफल");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [token]);

  const handleStatusChange = async (projectId, status, successMsg) => {
    setActionLoading(projectId);
    try {
      await api(`/contractor/projects/${projectId}/status`, 'POST', { status }, token);
      showToast(successMsg || t('saved') || 'सफलतापूर्वक अपडेट हुआ!');
      await loadProjects();
    } catch (err) {
      showToast(err.message || "स्टेटस बदलने में विफल");
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignModal = async (p) => {
    try {
      const res = await api('/contractor/crew', 'GET', null, token);
      setCrewList(res.crew || []);
      setSelectedCrew(p.assigned_crew || []);
      setAssignModalProject(p);
    } catch (err) {
      showToast(err.message || "लेबर/साथी लोड नहीं हो सके");
    }
  };

  const handleSaveAssignedCrew = async () => {
    if (!assignModalProject) return;
    try {
      await api(`/contractor/projects/${assignModalProject.id}/assign`, 'POST', {
        crew_ids: selectedCrew
      }, token);
      showToast(t('assignedOk') || "साथी सफलतापूर्वक जोड़े गए!");
      setAssignModalProject(null);
      loadProjects();
    } catch (err) {
      showToast(err.message || "साथी जोड़ने में विफल");
    }
  };

  const toggleCrewMember = (id) => {
    if (selectedCrew.includes(id)) {
      setSelectedCrew(selectedCrew.filter(x => x !== id));
    } else {
      setSelectedCrew([...selectedCrew, id]);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return <span className="pill" style={{ background: '#f57c00', color: '#fff' }}>🟡 नया अनुरोध</span>;
      case 'accepted':
        return <span className="pill" style={{ background: '#1976d2', color: '#fff' }}>🟢 स्वीकृत (तैयार)</span>;
      case 'in_progress':
        return <span className="pill" style={{ background: '#2e7d32', color: '#fff' }}>🏗️ काम चालू</span>;
      case 'completed':
        return <span className="pill" style={{ background: '#388e3c', color: '#fff' }}>✅ संपन्न</span>;
      case 'rejected':
        return <span className="pill" style={{ background: '#d32f2f', color: '#fff' }}>❌ अस्वीकृत</span>;
      case 'cancelled':
        return <span className="pill" style={{ background: '#757575', color: '#fff' }}>❌ रद्द</span>;
      default:
        return <span className="pill offline">{status}</span>;
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (filter === 'requested') return p.status === 'requested';
    if (filter === 'active') return p.status === 'accepted' || p.status === 'in_progress';
    if (filter === 'completed') return p.status === 'completed';
    return true;
  });

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🏗️ {t('projects') || 'ठेकेदार प्रोजेक्ट्स'}</h2>
        <button className="sec" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={loadProjects} disabled={loading}>
          🔄 रिफ्रेश
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', margin: '0 0 12px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          className={filter === 'all' ? '' : 'sec'}
          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('all')}
        >
          सभी ({projects.length})
        </button>
        <button
          className={filter === 'requested' ? '' : 'sec'}
          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('requested')}
        >
          🟡 नए अनुरोध ({projects.filter(p => p.status === 'requested').length})
        </button>
        <button
          className={filter === 'active' ? '' : 'sec'}
          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('active')}
        >
          🏗️ चालू प्रोजेक्ट्स ({projects.filter(p => p.status === 'accepted' || p.status === 'in_progress').length})
        </button>
        <button
          className={filter === 'completed' ? '' : 'sec'}
          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('completed')}
        >
          ✅ पूर्ण ({projects.filter(p => p.status === 'completed').length})
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && filteredProjects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏗️</div>
          <div>{filter === 'requested' ? 'कोई नया अनुरोध नहीं आया है' : (t('noProjects') || 'कोई प्रोजेक्ट नहीं मिला')}</div>
        </div>
      )}

      {filteredProjects.map((p) => {
        const isBusy = actionLoading === p.id;
        return (
          <div
            key={p.id}
            className="card"
            style={{
              borderLeft: p.status === 'requested' ? '4px solid #f57c00' : p.status === 'in_progress' ? '4px solid #2e7d32' : '4px solid #e0e0e0',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <b style={{ fontSize: '17px', color: '#222' }}>{p.title}</b>
                <div className="sub" style={{ margin: '4px 0', fontSize: '13px' }}>
                  👤 ग्राहक: <b>{p.customer_name || t('customer') || 'Customer'}</b>
                  {p.workers_needed ? ` · 👥 ${p.workers_needed} लेबर/कारीगर चाहिए` : ''}
                  {p.days ? ` · ⏱️ ${p.days} दिन` : ''}
                </div>
              </div>
              <div>{getStatusBadge(p.status)}</div>
            </div>

            {p.address && (
              <div style={{ fontSize: '12px', color: '#666', margin: '3px 0' }}>
                📍 साइट: {p.address}
              </div>
            )}

            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--g)', margin: '6px 0' }}>
              बजट: ₹{(p.total_budget || p.budget || 0).toLocaleString('en-IN')}
            </div>

            {p.description && (
              <p style={{ fontSize: '13px', margin: '6px 0', background: '#f9f9f9', padding: '8px 10px', borderRadius: '6px', color: '#444' }}>
                {p.description}
              </p>
            )}

            {/* Direct Chat & Call with Customer */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
              {p.customer_phone && (
                <a
                  href={`tel:${p.customer_phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}
                >
                  📞 {p.customer_phone}
                </a>
              )}
              {onOpenChat && (
                <button
                  type="button"
                  className="sec"
                  style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 'bold' }}
                  onClick={() => onOpenChat({
                    kind: 'projects',
                    id: p.id,
                    other_name: p.customer_name || 'Customer',
                    other_phone: p.customer_phone || '',
                    other_id: p.customer_id
                  })}
                >
                  💬 ग्राहक से चैट
                </button>
              )}
            </div>

            {/* Action Buttons depending on status */}
            <div className="row" style={{ marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
              {/* 1. Status: REQUESTED */}
              {p.status === 'requested' && (
                <>
                  <button
                    style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold' }}
                    onClick={() => handleStatusChange(p.id, 'accepted', '🎉 प्रोजेक्ट अनुरोध स्वीकार कर लिया गया!')}
                    disabled={isBusy}
                  >
                    ✅ स्वीकार करें (Accept)
                  </button>
                  <button
                    className="sec"
                    style={{ fontWeight: 'bold' }}
                    onClick={() => onOpenCounter('projects', p.id, loadProjects)}
                    disabled={isBusy}
                  >
                    ↔️ मोलभाव (Counter Offer)
                  </button>
                  <button
                    className="warn"
                    style={{ fontSize: '12px' }}
                    onClick={() => {
                      if (window.confirm("क्या आप इस प्रोजेक्ट को अस्वीकार करना चाहते हैं?")) {
                        handleStatusChange(p.id, 'rejected', 'प्रोजेक्ट अस्वीकार कर दिया गया');
                      }
                    }}
                    disabled={isBusy}
                  >
                    ❌ अस्वीकार
                  </button>
                </>
              )}

              {/* 2. Status: ACCEPTED */}
              {p.status === 'accepted' && (
                <>
                  <button
                    style={{ background: '#1976d2', color: '#fff', fontWeight: 'bold' }}
                    onClick={() => handleStatusChange(p.id, 'in_progress', '🏗️ प्रोजेक्ट का काम शुरू हो गया!')}
                    disabled={isBusy}
                  >
                    ▶️ काम शुरू करें (Start Work)
                  </button>
                  <button className="sec" onClick={() => openAssignModal(p)} disabled={isBusy}>
                    👥 साथी / लेबर जोड़ें ({p.crew_assigned || 0})
                  </button>
                  <button
                    className="warn"
                    style={{ fontSize: '12px' }}
                    onClick={() => {
                      if (window.confirm("क्या आप प्रोजेक्ट रद्द करना चाहते हैं?")) {
                        handleStatusChange(p.id, 'cancelled', 'प्रोजेक्ट रद्द किया गया');
                      }
                    }}
                    disabled={isBusy}
                  >
                    रद्द करें
                  </button>
                </>
              )}

              {/* 3. Status: IN_PROGRESS */}
              {p.status === 'in_progress' && (
                <>
                  <button
                    style={{ background: '#2e7d32', color: '#fff', fontWeight: 'bold' }}
                    onClick={() => handleStatusChange(p.id, 'completed', '🎉 बधाई! प्रोजेक्ट पूरा हुआ दर्ज किया गया!')}
                    disabled={isBusy}
                  >
                    🏁 काम पूरा हुआ (Mark Completed)
                  </button>
                  <button className="sec" onClick={() => openAssignModal(p)} disabled={isBusy}>
                    👥 साथी / लेबर जोड़ें ({p.crew_assigned || 0})
                  </button>
                </>
              )}

              {/* 4. Status: COMPLETED */}
              {p.status === 'completed' && (
                <div style={{ fontSize: '13px', color: '#2e7d32', fontWeight: 'bold' }}>
                  ✅ यह प्रोजेक्ट सफलतापूर्वक पूरा हो चुका है।
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Assign Crew Modal */}
      {assignModalProject && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setAssignModalProject(null); }}>
          <div className="sheet">
            <h3>👥 प्रोजेक्ट में साथी जोड़ें: {assignModalProject.title}</h3>
            <div className="chk" style={{ margin: '14px 0', maxHeight: '50vh', overflowY: 'auto' }}>
              {crewList.length === 0 && (
                <div className="sub" style={{ padding: '12px', textAlign: 'center' }}>
                  आपकी क्रू लिस्ट में कोई साथी नहीं है। पहले 'क्रू/साथी' टैब से साथी जोड़ें।
                </div>
              )}
              {crewList.map((c) => (
                <label key={c.id} style={{ display: 'block', margin: '8px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedCrew.includes(c.id)}
                    onChange={() => toggleCrewMember(c.id)}
                  />
                  <b>{c.name}</b> {c.skills ? `(${c.skills})` : ''} · 📱 {c.phone || t('offlineWorker') || 'फ़ोन नहीं'}
                </label>
              ))}
            </div>
            <div className="row">
              <button onClick={handleSaveAssignedCrew}>{t('save') || 'सेव करें'}</button>
              <button className="sec" onClick={() => setAssignModalProject(null)}>{t('close') || 'बंद करें'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
