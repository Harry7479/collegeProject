import { useCallback, useEffect, useState } from 'react';
import { superAdminAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import {
  FileText,
  IdCard,
  GraduationCap,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  LogOut,
  Search,
} from 'lucide-react';
import './AdminApproval.css';

const DOC_TYPE_META = {
  bar_council_certificate: { label: 'Bar Council Certificate', Icon: ShieldCheck },
  id_proof:               { label: 'ID Proof',                Icon: IdCard },
  degree_certificate:     { label: 'Law Degree',              Icon: GraduationCap },
  other:                  { label: 'Other Document',          Icon: Paperclip },
};

function DocBadge({ doc }) {
  const meta = DOC_TYPE_META[doc.docType] || DOC_TYPE_META.other;
  const { Icon } = meta;
  return (
    <a
      href={doc.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="verification-doc-badge"
      title={doc.originalName || meta.label}
    >
      <Icon size={14} />
      <span>{meta.label}</span>
      <ExternalLink size={11} />
    </a>
  );
}

export default function AdminApprovalPage() {
  const [email, setEmail] = useState('admin@legalmind.ai');
  const [password, setPassword] = useState('admin12345');
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('legalmind_admin_token'));

  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [actionLawyerId, setActionLawyerId] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const { addToast } = useToast();

  const loadLawyers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.getAllLawyers();
      setLawyers(res.data || []);
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Failed to load lawyers';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (loggedIn) loadLawyers();
  }, [loggedIn, loadLawyers]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const res = await superAdminAPI.login(email, password);
      localStorage.setItem('legalmind_admin_token', res.data.token);
      setLoggedIn(true);
      addToast('Super admin login successful', 'success');
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Login failed';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    }
  };

  const handleVerify = async (lawyerId, action) => {
    const rejectionReason =
      action === 'reject'
        ? window.prompt('Reason for rejection?') || 'Rejected by super-admin'
        : undefined;

    try {
      setActionLawyerId(lawyerId);
      await superAdminAPI.verifyLawyer(lawyerId, action, rejectionReason);
      addToast(`Lawyer ${action}d successfully`, 'success');
      await loadLawyers();
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Verification update failed';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    } finally {
      setActionLawyerId('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('legalmind_admin_token');
    setLoggedIn(false);
    setLawyers([]);
    addToast('Super admin logged out', 'info');
  };

  const filteredLawyers = lawyers.filter((lawyer) => {
    const matchesSearch =
      lawyer.name.toLowerCase().includes(search.toLowerCase()) ||
      lawyer.email.toLowerCase().includes(search.toLowerCase()) ||
      (lawyer.barCouncilId || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || lawyer.verificationStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = lawyers.filter((l) => l.verificationStatus === 'pending').length;

  /* ── Login Screen ────────────────────────────────────────────── */
  if (!loggedIn) {
    return (
      <div className="admin-shell">
        <form className="glass-card admin-login-card" onSubmit={handleLogin}>
          <h1 className="auth-title">Super Admin Approval</h1>
          <p className="auth-subtitle">Approve or reject lawyer registrations</p>

          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="gradient-btn auth-btn" type="submit">Login</button>

          {message && <p className="auth-error">{message}</p>}
        </form>
      </div>
    );
  }

  /* ── Dashboard ───────────────────────────────────────────────── */
  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div>
          <h1 className="page-title">
            Lawyer Verification Queue
            {pendingCount > 0 && (
              <span className="pending-badge">{pendingCount} pending</span>
            )}
          </h1>
          <p className="page-subtitle">
            Review uploaded proof documents before approving lawyers
          </p>
        </div>
        <button className="outline-btn" onClick={handleLogout}>
          <LogOut size={15} /> Logout
        </button>
      </div>

      {/* Controls */}
      <div className="admin-controls">
        <label className="admin-search-label">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, email, or Bar Council ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
        </label>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field admin-filter-select"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading && <p className="status-text">Loading lawyers...</p>}
      {message && <p className="status-text">{message}</p>}

      <div className="admin-grid">
        {filteredLawyers.length === 0 && (
          <p className="empty-text">No lawyers found</p>
        )}

        {filteredLawyers.map((lawyer) => {
          const isExpanded = expandedId === lawyer._id;
          const docs = lawyer.verificationDocuments || [];
          const hasNoDocs = docs.length === 0;

          return (
            <div
              className={`glass-card admin-lawyer-card ${isExpanded ? 'card-expanded' : ''}`}
              key={lawyer._id}
            >
              {/* Card header row */}
              <div
                className="lawyer-card-header"
                onClick={() => setExpandedId(isExpanded ? null : lawyer._id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="lawyer-card-info">
                  <h3>{lawyer.name}</h3>
                  <p className="lawyer-email">{lawyer.email}</p>
                  <p className="lawyer-city">📍 {lawyer.city || 'City not provided'}</p>
                </div>

                <div className="lawyer-card-right">
                  <span className={`status-badge ${lawyer.verificationStatus}`}>
                    {lawyer.verificationStatus}
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="lawyer-card-body">
                  {/* Key info grid */}
                  <div className="lawyer-detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Bar Council ID</span>
                      <span className="detail-value">{lawyer.barCouncilId || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Specialization</span>
                      <span className="detail-value">
                        {(lawyer.specialization || []).join(', ') || 'General'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Experience</span>
                      <span className="detail-value">{lawyer.experienceYears ?? 0} yrs</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{lawyer.phone || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Registered</span>
                      <span className="detail-value">
                        {new Date(lawyer.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    {lawyer.verifiedAt && (
                      <div className="detail-item">
                        <span className="detail-label">
                          {lawyer.verificationStatus === 'approved' ? 'Approved On' : 'Reviewed On'}
                        </span>
                        <span className="detail-value">
                          {new Date(lawyer.verifiedAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {lawyer.verifiedBy && (
                      <div className="detail-item">
                        <span className="detail-label">Reviewed By</span>
                        <span className="detail-value">{lawyer.verifiedBy}</span>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {lawyer.rejectionReason && (
                    <div className="rejection-banner">
                      <ShieldX size={14} />
                      <span>Reason: {lawyer.rejectionReason}</span>
                    </div>
                  )}

                  {/* ── Verification Documents ── */}
                  <div className="verification-docs-section">
                    <h4 className="docs-section-title">
                      <FileText size={14} /> Verification Documents
                    </h4>

                    {hasNoDocs ? (
                      <div className="no-docs-warning">
                        ⚠️ No documents uploaded yet. The lawyer has not submitted proof.
                        {lawyer.verificationStatus === 'pending' && (
                          <span> Consider rejecting if documents are not provided.</span>
                        )}
                      </div>
                    ) : (
                      <div className="docs-list">
                        {docs.map((doc, i) => (
                          <DocBadge key={i} doc={doc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {lawyer.verificationStatus === 'pending' ? (
                    <div className="admin-actions">
                      <button
                        className="gradient-btn approve-btn"
                        onClick={() => handleVerify(lawyer._id, 'approve')}
                        disabled={actionLawyerId === lawyer._id || hasNoDocs}
                        title={hasNoDocs ? 'Cannot approve without documents' : 'Approve this lawyer'}
                      >
                        <ShieldCheck size={15} />
                        {actionLawyerId === lawyer._id ? 'Processing...' : 'Approve'}
                      </button>

                      <button
                        className="outline-btn reject-btn"
                        onClick={() => handleVerify(lawyer._id, 'reject')}
                        disabled={actionLawyerId === lawyer._id}
                      >
                        <ShieldX size={15} />
                        Reject
                      </button>

                      {hasNoDocs && (
                        <p className="no-docs-hint">
                          Approve button disabled — no verification documents uploaded
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="admin-locked">
                      {lawyer.verificationStatus === 'approved' ? '✅ Approved' : '❌ Rejected'} — Action closed
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
