import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ContractorProjects({ token, onOpenCounter, showToast, t }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModalProject, setAssignModalProject] = useState(null);
  const [crewList, setCrewList] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState([]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api('/contractor/projects', 'GET', null, token);
      setProjects(res.projects || []);
    } catch (err) {
      showToast(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [token]);

  const handleStatusChange = async (projectId, status) => {
    try {
      await api(`/contractor/projects/${projectId}/status`, 'POST', { status }, token);
      showToast(t('saved'));
      loadProjects();
    } catch (err) {
      showToast(err.message || "Status change failed");
    }
  };

  const openAssignModal = async (p) => {
    try {
      const res = await api('/contractor/crew', 'GET', null, token);
      setCrewList(res.crew || []);
      setSelectedCrew(p.assigned_crew || []);
      setAssignModalProject(p);
    } catch (err) {
      showToast(err.message || "Failed to load crew");
    }
  };

  const handleSaveAssignedCrew = async () => {
    if (!assignModalProject) return;
    try {
      await api(`/contractor/projects/${assignModalProject.id}/assign`, 'POST', {
        crew_ids: selectedCrew
      }, token);
      showToast(t('assignedOk'));
      setAssignModalProject(null);
      loadProjects();
    } catch (err) {
      showToast(err.message || "Assign failed");
    }
  };

  const toggleCrewMember = (id) => {
    if (selectedCrew.includes(id)) {
      setSelectedCrew(selectedCrew.filter(x => x !== id));
    } else {
      setSelectedCrew([...selectedCrew, id]);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>🏗️ {t('projects')}</h2>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }} className="sub">लोड हो रहा है…</div>}

      {!loading && projects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏗️</div>
          <div>{t('noProjects')}</div>
        </div>
      )}

      {projects.map((p) => (
        <div key={p.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: '17px' }}>{p.title}</b>
            <span className={`pill ${p.status === 'completed' ? 'free' : p.status === 'active' ? 'busy' : 'offline'}`}>
              {p.status}
            </span>
          </div>

          <div className="sub" style={{ margin: '4px 0' }}>
            👤 {p.customer_name || t('customer')} · 👥 {p.workers_needed || 1} {t('workersNeeded')}
          </div>

          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--g)', margin: '4px 0' }}>
            ₹{(p.total_budget || 0).toLocaleString('en-IN')}
          </div>

          {p.description && <p style={{ fontSize: '14px', margin: '6px 0' }}>{p.description}</p>}

          <div className="row" style={{ marginTop: '10px' }}>
            <button className="sec" onClick={() => openAssignModal(p)}>
              👥 {t('assignCrew')}
            </button>
            {p.status === 'pending' && (
              <button onClick={() => handleStatusChange(p.id, 'active')}>
                {t('startProject')}
              </button>
            )}
            {p.status === 'active' && (
              <button style={{ background: '#2e7d32' }} onClick={() => handleStatusChange(p.id, 'completed')}>
                {t('finish')}
              </button>
            )}
            <button className="sec" onClick={() => onOpenCounter('projects', p.id, loadProjects)}>
              ↔️ {t('counter')}
            </button>
          </div>
        </div>
      ))}

      {/* Assign Crew Modal */}
      {assignModalProject && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setAssignModalProject(null); }}>
          <div className="sheet">
            <h3>👥 प्रोजेक्ट में साथी जोड़ें: {assignModalProject.title}</h3>
            <div className="chk" style={{ margin: '14px 0' }}>
              {crewList.map((c) => (
                <label key={c.id} style={{ display: 'block', margin: '8px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedCrew.includes(c.id)}
                    onChange={() => toggleCrewMember(c.id)}
                  />
                  {c.name} ({c.phone || t('offlineWorker')})
                </label>
              ))}
            </div>
            <div className="row">
              <button onClick={handleSaveAssignedCrew}>{t('save')}</button>
              <button className="sec" onClick={() => setAssignModalProject(null)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

