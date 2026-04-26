import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { lawyerAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import { playNotificationTone, startTitleBlink } from '../utils/realtimeNotify';
import {
  CheckCircle2, XCircle, Search, Clock3, CircleCheckBig,
  BriefcaseBusiness, Upload, FileText, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import './LawyerDashboard.css';

export default function LawyerDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updatingRequestId, setUpdatingRequestId] = useState('');
  const [requestFilter, setRequestFilter] = useState('all');
  const [requestQuery, setRequestQuery] = useState('');
  const { addToast } = useToast();
  const blinkStopRef = useRef(null);

  const [profilePayload, setProfilePayload] = useState({
    city: '',
    whatsappNumber: '',
    consultationFee: '',
    bio: '',
    specialization: '',
    languages: '',
    availabilityStatus: 'offline',
  });

  // ── Verification document upload state ────────────────────────
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [docUploading, setDocUploading] = useState(false);
  const [docProgress, setDocProgress] = useState(0);
  const [docEntries, setDocEntries] = useState([
    { docType: 'bar_council_certificate', file: null },
    { docType: 'id_proof', file: null },
  ]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes, requestsRes] = await Promise.all([
        lawyerAPI.adminProfile(),
        lawyerAPI.adminStats(),
        lawyerAPI.adminRequests(),
      ]);

      const profileData = profileRes.data;
      setProfile(profileData);
      setStats(statsRes.data);
      setRequests(requestsRes.data || []);

      setProfilePayload({
        city: profileData.city || '',
        whatsappNumber: profileData.whatsappNumber || '',
        consultationFee: profileData.consultationFee || '',
        bio: profileData.bio || '',
        specialization: (profileData.specialization || []).join(', '),
        languages: (profileData.languages || []).join(', '),
        availabilityStatus: profileData.availabilityStatus || 'offline',
      });
      setVerificationDocs(profileData.verificationDocuments || []);
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Unable to load dashboard';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const token = localStorage.getItem('legalmind_lawyer_token');
    if (!token) return undefined;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketBase = import.meta.env.VITE_SOCKET_URL || apiBase.replace(/\/api\/?$/, '');

    const socket = io(socketBase, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('consultation:message', (payload) => {
      const consultationId = payload?.consultationId;
      if (!consultationId || payload?.senderType !== 'user') return;

      playNotificationTone();
      if (document.hidden && !blinkStopRef.current) {
        blinkStopRef.current = startTitleBlink('New client message');
      }

      setRequests((prev) => prev.map((item) => (
        item._id === consultationId
          ? { ...item, unreadCount: (item.unreadCount || 0) + 1 }
          : item
      )));
    });

    socket.on('consultation:status-updated', (payload) => {
      const consultationId = payload?.consultationId;
      const nextStatus = payload?.status;
      if (!consultationId || !nextStatus) return;

      setRequests((prev) => prev.map((item) => (
        item._id === consultationId
          ? { ...item, status: nextStatus, lawyerResponseNote: payload?.lawyerResponseNote || item.lawyerResponseNote }
          : item
      )));
    });

    return () => {
      if (blinkStopRef.current) {
        blinkStopRef.current();
        blinkStopRef.current = null;
      }
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('legalmind_lawyer_token');
    localStorage.removeItem('legalmind_lawyer_name');
    addToast('Logged out successfully', 'info');
    navigate('/lawyer/login');
  };

  const handleProfileUpdate = async () => {
    setMessage('');
    try {
      await lawyerAPI.updateAdminProfile({
        ...profilePayload,
        specialization: profilePayload.specialization,
        languages: profilePayload.languages,
      });
      setMessage('Profile updated');
      addToast('Profile updated', 'success');
      await loadDashboard();
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Profile update failed';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    }
  };

  const handleRequestStatus = async (requestId, status) => {
    try {
      const currentRequest = requests.find((item) => item._id === requestId);
      setUpdatingRequestId(requestId);
      await lawyerAPI.updateRequestStatus(requestId, { status });
      addToast(`Request ${status}`, 'success');
      await loadDashboard();
      if ((status === 'accepted' || status === 'in-progress') && currentRequest?.preferredMode === 'chat') {
        navigate(`/lawyer/consultation-chat/${requestId}`);
      }
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Failed to update request';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    } finally {
      setUpdatingRequestId('');
    }
  };

  const openRequestPdf = (requestItem) => {
    const pdfUrl = requestItem?.documentId?.fileUrl;
    if (!pdfUrl) {
      addToast('No PDF attached for this request', 'info');
      return;
    }
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Verification doc helpers ────────────────────────────────────
  const handleDocFileChange = (idx, file) => {
    setDocEntries((p) => p.map((e, i) => (i === idx ? { ...e, file } : e)));
  };

  const handleDocTypeChange = (idx, docType) => {
    setDocEntries((p) => p.map((e, i) => (i === idx ? { ...e, docType } : e)));
  };

  const handleDocUpload = async () => {
    const hasBarCouncil = docEntries.some((e) => e.docType === 'bar_council_certificate' && e.file);
    const hasIdProof = docEntries.some((e) => e.docType === 'id_proof' && e.file);
    if (!hasBarCouncil || !hasIdProof) {
      addToast('Please select at least Bar Council Certificate and ID Proof files', 'error');
      return;
    }
    setDocUploading(true);
    setDocProgress(0);
    try {
      const formData = new FormData();
      const types = [];
      for (const entry of docEntries) {
        if (entry.file) {
          formData.append('verificationDocs', entry.file);
          types.push(entry.docType);
        }
      }
      formData.append('docTypes', JSON.stringify(types));
      const res = await lawyerAPI.uploadVerificationDocs(formData, (evt) => {
        setDocProgress(Math.round((evt.loaded * 100) / evt.total));
      });
      setVerificationDocs(res.data.verificationDocuments || []);
      addToast('Verification documents uploaded!', 'success');
      setDocEntries([
        { docType: 'bar_council_certificate', file: null },
        { docType: 'id_proof', file: null },
      ]);
    } catch (err) {
      addToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setDocUploading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const normalizedQuery = requestQuery.trim().toLowerCase();

    return requests.filter((item) => {
      if (requestFilter === 'pending' && item.status !== 'pending') return false;
      if (requestFilter === 'active' && !['accepted', 'in-progress'].includes(item.status)) return false;
      if (requestFilter === 'closed' && !['completed', 'rejected', 'cancelled'].includes(item.status)) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        item.userId?.name,
        item.issueSummary,
        item.preferredMode,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [requestFilter, requestQuery, requests]);

  const getStatusTone = (status) => {
    if (['accepted', 'in-progress'].includes(status)) return 'status-pill-active';
    if (status === 'pending') return 'status-pill-pending';
    return 'status-pill-closed';
  };

  if (loading) {
    return (
      <div className="lawyer-shell">
        <div className="glass-card lawyer-card">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="lawyer-shell">
      <div className="lawyer-header">
        <div className="lawyer-header-left">
          <h1 className="page-title">Lawyer Dashboard</h1>
          <p className="page-subtitle">Welcome {profile?.name || localStorage.getItem('legalmind_lawyer_name') || 'Lawyer'}</p>
          <div className={`availability-pill availability-${profilePayload.availabilityStatus}`}>
            Availability: {profilePayload.availabilityStatus}
          </div>
        </div>
        <button className="outline-btn" onClick={handleLogout}>Logout</button>
      </div>

      {message && <p className="status-text">{message}</p>}

      <div className="lawyer-stats-grid">
        <div className="glass-card lawyer-card stat-card stat-all"><h3><BriefcaseBusiness size={16} /> Total Requests</h3><p>{stats?.totalRequests || 0}</p></div>
        <div className="glass-card lawyer-card stat-card stat-pending"><h3><Clock3 size={16} /> Pending</h3><p>{stats?.pendingRequests || 0}</p></div>
        <div className="glass-card lawyer-card stat-card stat-active"><h3><CheckCircle2 size={16} /> Accepted</h3><p>{stats?.acceptedRequests || 0}</p></div>
        <div className="glass-card lawyer-card stat-card stat-complete"><h3><CircleCheckBig size={16} /> Completed</h3><p>{stats?.completedRequests || 0}</p></div>
      </div>

      <div className="lawyer-grid">
        <section className="glass-card lawyer-card">
          <h2 className="section-heading">Profile & Availability</h2>
          <div className="form-grid">
            <input className="input-field" placeholder="City" value={profilePayload.city} onChange={(e) => setProfilePayload((p) => ({ ...p, city: e.target.value }))} />
            <input className="input-field" placeholder="WhatsApp Number" value={profilePayload.whatsappNumber} onChange={(e) => setProfilePayload((p) => ({ ...p, whatsappNumber: e.target.value }))} />
            <input className="input-field" placeholder="Consultation Fee" value={profilePayload.consultationFee} onChange={(e) => setProfilePayload((p) => ({ ...p, consultationFee: e.target.value }))} />
            <input className="input-field" placeholder="Specialization (comma separated)" value={profilePayload.specialization} onChange={(e) => setProfilePayload((p) => ({ ...p, specialization: e.target.value }))} />
            <input className="input-field" placeholder="Languages (comma separated)" value={profilePayload.languages} onChange={(e) => setProfilePayload((p) => ({ ...p, languages: e.target.value }))} />
            <select className="input-field" value={profilePayload.availabilityStatus} onChange={(e) => setProfilePayload((p) => ({ ...p, availabilityStatus: e.target.value }))}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="busy">Busy</option>
            </select>
            <textarea className="input-field" rows={4} placeholder="Bio" value={profilePayload.bio} onChange={(e) => setProfilePayload((p) => ({ ...p, bio: e.target.value }))} />
          </div>
          <button className="gradient-btn" onClick={handleProfileUpdate}>Update Profile</button>
        </section>

        {/* ── Verification Documents Card ── */}
        <section className="glass-card lawyer-card">
          <h2 className="section-heading">
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6 }} />
            Verification Documents
          </h2>

          {verificationDocs.length === 0 ? (
            <div className="dash-no-docs-warn">
              <AlertTriangle size={15} />
              <div>
                <strong>No documents uploaded yet.</strong>
                <p>Upload your Bar Council Certificate and Government ID so the admin can verify you are a licensed lawyer.</p>
              </div>
            </div>
          ) : (
            <div className="dash-docs-list">
              {verificationDocs.map((doc, i) => (
                <a
                  key={i}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-doc-badge"
                >
                  <FileText size={13} />
                  {doc.docType.replace(/_/g, ' ')}
                </a>
              ))}
            </div>
          )}

          <div className="dash-doc-upload-section">
            <p className="dash-upload-label">Upload New Documents</p>
            {docEntries.map((entry, idx) => (
              <div key={idx} className="dash-doc-row">
                <select
                  className="input-field dash-doc-select"
                  value={entry.docType}
                  onChange={(e) => handleDocTypeChange(idx, e.target.value)}
                >
                  <option value="bar_council_certificate">Bar Council Certificate</option>
                  <option value="id_proof">Government ID Proof</option>
                  <option value="degree_certificate">Law Degree Certificate</option>
                  <option value="other">Other</option>
                </select>
                <label className="dash-file-label">
                  {entry.file ? (
                    <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} /> {entry.file.name.slice(0, 22)}{entry.file.name.length > 22 ? '...' : ''}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Upload size={13} /> Choose File
                    </span>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocFileChange(idx, e.target.files[0] || null)}
                  />
                </label>
              </div>
            ))}

            {docUploading && (
              <div className="dash-progress-wrap">
                <div className="dash-progress-bar" style={{ width: `${docProgress}%` }} />
              </div>
            )}

            <button
              className="gradient-btn"
              onClick={handleDocUpload}
              disabled={docUploading}
              style={{ marginTop: 8 }}
            >
              <Upload size={14} />
              {docUploading ? `Uploading ${docProgress}%...` : 'Submit Documents'}
            </button>
          </div>
        </section>
      </div> {/* End lawyer-grid */}

      <section className="glass-card lawyer-card" style={{ marginTop: '24px' }}>
          <div className="requests-head">
            <h2 className="section-heading">Consultation Requests</h2>
            <div className="request-filter-row">
              <button className={`filter-chip ${requestFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setRequestFilter('all')}>All</button>
              <button className={`filter-chip ${requestFilter === 'pending' ? 'chip-active' : ''}`} onClick={() => setRequestFilter('pending')}>Pending</button>
              <button className={`filter-chip ${requestFilter === 'active' ? 'chip-active' : ''}`} onClick={() => setRequestFilter('active')}>Active</button>
              <button className={`filter-chip ${requestFilter === 'closed' ? 'chip-active' : ''}`} onClick={() => setRequestFilter('closed')}>Closed</button>
            </div>
            <label className="request-search-wrap" htmlFor="request-search">
              <Search size={15} />
              <input
                id="request-search"
                className="request-search"
                placeholder="Search by client, status, mode..."
                value={requestQuery}
                onChange={(e) => setRequestQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="requests-list">
            {filteredRequests.length === 0 && <p className="empty-text">No requests found for selected filter</p>}
            {filteredRequests.map((item) => (
              <div className="request-item" key={item._id}>
                <p className="request-title">
                  {item.userId?.name || 'User'}
                  <span className={`status-pill ${getStatusTone(item.status)}`}>{item.status}</span>
                  {item.unreadCount > 0 && <span className="unread-pill">{item.unreadCount} new</span>}
                </p>
                <p className="request-summary">{item.issueSummary}</p>
                <p className="request-meta">Preferred: {item.preferredMode} | {item.preferredTime || 'Any time'}</p>
                {item.documentId?.title && (
                  <div className="request-doc-row">
                    <span className="request-doc-label">PDF: {item.documentId.title}</span>
                    <button
                      className="outline-btn action-btn"
                      onClick={() => openRequestPdf(item)}
                    >
                      View PDF
                    </button>
                  </div>
                )}
                <div className="request-actions">
                  {item.status === 'pending' && (
                    <>
                      <button className="outline-btn action-btn" onClick={() => handleRequestStatus(item._id, 'accepted')} disabled={updatingRequestId === item._id}><CheckCircle2 size={16} /> Accept</button>
                      <button className="outline-btn action-btn" onClick={() => handleRequestStatus(item._id, 'rejected')} disabled={updatingRequestId === item._id}><XCircle size={16} /> Reject</button>
                    </>
                  )}
                  {(item.status === 'accepted' || item.status === 'in-progress') && (
                    <>
                      <button className="outline-btn action-btn" onClick={() => handleRequestStatus(item._id, 'completed')} disabled={updatingRequestId === item._id}>Mark Complete</button>
                      {item.preferredMode === 'chat' && (
                        <button
                          className="outline-btn action-btn"
                          onClick={() => navigate(`/lawyer/consultation-chat/${item._id}`)}
                          disabled={updatingRequestId === item._id}
                        >
                          Open Chat
                        </button>
                      )}
                    </>
                  )}
                  {['completed', 'rejected', 'cancelled'].includes(item.status) && (
                    <span className="request-locked">Action closed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
    </div>
  );
}
