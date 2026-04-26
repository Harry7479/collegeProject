import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import { documentsAPI, lawyerAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import { playNotificationTone, startTitleBlink } from '../utils/realtimeNotify';
import { UserCheck, Send, Clock, MessageCircle, Phone, MessageSquare, Users, FileText, CalendarClock, MapPin, BadgeIndianRupee, Star, ChevronDown } from 'lucide-react';
import './ConnectLawyer.css';

export default function ConnectLawyerPage() {
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [preferredMode, setPreferredMode] = useState('chat');
  const [preferredTime, setPreferredTime] = useState('');
  const [rawDateTime, setRawDateTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const REQUESTS_PAGE_SIZE = 3;
  const [visibleCount, setVisibleCount] = useState(REQUESTS_PAGE_SIZE);
  const { addToast } = useToast();
  const blinkStopRef = useRef(null);

  const selectedLawyer = useMemo(
    () => lawyers.find((item) => item._id === selectedLawyerId),
    [lawyers, selectedLawyerId]
  );

  // Format datetime-local value → readable string for backend
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Min datetime = now (prevent past selections)
  const minDateTime = new Date(Date.now() + 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const redirectToWhatsApp = (lawyer, summary, timeValue) => {
    const rawPhone = lawyer?.whatsappNumber || lawyer?.phone || '';
    const digitsOnly = String(rawPhone).replace(/\D/g, '');

    if (!digitsOnly) {
      addToast('Lawyer WhatsApp number is missing, cannot open WhatsApp.', 'error');
      return;
    }

    const whatsappNumber = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
    const text = `Hi ${lawyer?.name || 'Lawyer'}, I sent a consultation request on LegalMind. Issue: ${summary}${timeValue ? ` | Preferred time: ${timeValue}` : ''}`;
    const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.location.href = link;
  };

  const openCallDialer = (lawyer) => {
    const rawPhone = lawyer?.phone || lawyer?.whatsappNumber || '';
    const digitsOnly = String(rawPhone).replace(/\D/g, '');

    if (!digitsOnly) {
      addToast('Lawyer phone number is missing, cannot start call.', 'error');
      return;
    }

    const dialNumber = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`;
    window.location.href = `tel:${dialNumber}`;
  };

  const openWhatsAppForRequest = (request) => {
    const lawyer = request?.lawyerId || {};
    const summary = request?.issueSummary || 'Legal consultation follow-up';
    const timeValue = request?.preferredTime || '';
    redirectToWhatsApp(lawyer, summary, timeValue);
  };

  useEffect(() => {
    const token = localStorage.getItem('legalmind_token');
    if (!token) return undefined;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketBase = import.meta.env.VITE_SOCKET_URL || apiBase.replace(/\/api\/?$/, '');

    const socket = io(socketBase, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('consultation:status-updated', (payload) => {
      const consultationId = payload?.consultationId;
      const nextStatus = payload?.status;
      if (!consultationId || !nextStatus) return;

      const matchedRequest = myRequests.find((item) => item._id === consultationId);
      const isChatMode = matchedRequest?.preferredMode === 'chat';

      setMyRequests((prev) => prev.map((item) => (
        item._id === consultationId
          ? { ...item, status: nextStatus, lawyerResponseNote: payload?.lawyerResponseNote || item.lawyerResponseNote }
          : item
      )));

      if (nextStatus === 'accepted' || nextStatus === 'in-progress') {
        playNotificationTone();
        if (document.hidden && !blinkStopRef.current) {
          blinkStopRef.current = startTitleBlink('Lawyer accepted your request');
        }
        if (isChatMode) {
          addToast('Lawyer accepted your request. Chat opened.', 'success');
          navigate(`/consultation-chat/${consultationId}`);
        } else {
          addToast(`Lawyer accepted your ${matchedRequest?.preferredMode || 'consultation'} request.`, 'success');
        }
      }
    });

    socket.on('consultation:message', (payload) => {
      const consultationId = payload?.consultationId;
      if (!consultationId || payload?.senderType !== 'lawyer') return;

      playNotificationTone();
      if (document.hidden && !blinkStopRef.current) {
        blinkStopRef.current = startTitleBlink('New lawyer message');
      }

      setMyRequests((prev) => prev.map((item) => (
        item._id === consultationId
          ? { ...item, unreadCount: (item.unreadCount || 0) + 1 }
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
  }, [addToast, myRequests, navigate]);

  const loadData = useCallback(async () => {
    try {
      const [availableRes, requestsRes, docsRes] = await Promise.all([
        lawyerAPI.listAvailable(),
        lawyerAPI.myRequests(),
        documentsAPI.getAll(),
      ]);
      setLawyers(availableRes.data || []);
      setMyRequests(requestsRes.data || []);
      setVisibleCount(REQUESTS_PAGE_SIZE); // reset pagination on reload
      setDocuments(docsRes.data || []);
      setSelectedLawyerId((current) => current || availableRes.data?.[0]?._id || '');
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Unable to load lawyers right now';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!selectedLawyerId || !issueSummary.trim()) {
      setMessage('Please select lawyer and add issue summary');
      addToast('Please select lawyer and add issue summary', 'error');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const modeToUse = preferredMode;
      const summaryValue = issueSummary.trim();
      const timeValue = preferredTime;

      await lawyerAPI.connect({
        lawyerId: selectedLawyerId,
        documentId: selectedDocumentId || undefined,
        issueSummary: summaryValue,
        preferredMode: modeToUse,
        preferredTime,
      });
      setIssueSummary('');
      setPreferredMode('chat');
      setPreferredTime('');
      setRawDateTime('');
      setSelectedDocumentId('');
      setMessage('Consultation request submitted successfully');
      addToast('Consultation request submitted successfully', 'success');
      await loadData();

      if (modeToUse === 'whatsapp') {
        redirectToWhatsApp(selectedLawyer, summaryValue, timeValue);
      }
    } catch (error) {
      const finalMessage = error.response?.data?.message || 'Failed to submit request';
      setMessage(finalMessage);
      addToast(finalMessage, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Connect Verified Lawyer</h1>
            <p className="page-subtitle">Raise a request if AI answer is not enough</p>
          </div>
        </div>

        <div className="connect-grid">
          <section className="glass-card connect-card create-request-card">
            {/* ── Header ── */}
            <div className="cr-header">
              <div className="cr-header-icon"><UserCheck size={20} /></div>
              <div>
                <h2 className="section-heading" style={{ marginBottom: 2 }}>Create Consultation Request</h2>
                <p className="cr-subtitle">Connect with a verified lawyer in minutes</p>
              </div>
            </div>

            <div className="cr-divider" />

            {/* ── Step 1: Select Lawyer ── */}
            <div className="cr-step">
              <span className="cr-step-num">1</span>
              <label className="cr-step-label">Choose Your Lawyer</label>
            </div>

            <div className="cr-select-wrap">
              <ChevronDown size={15} className="cr-select-icon" />
              <select
                className="input-field cr-select"
                value={selectedLawyerId}
                onChange={(e) => setSelectedLawyerId(e.target.value)}
              >
                <option value="">— Select a lawyer —</option>
                {lawyers.map((lawyer) => (
                  <option key={lawyer._id} value={lawyer._id}>
                    {lawyer.name} · {lawyer.city || 'NA'} · ₹{lawyer.consultationFee || 0}
                  </option>
                ))}
              </select>
            </div>

            {selectedLawyer && (
              <div className="lawyer-preview-card">
                <div className="lawyer-avatar">
                  {selectedLawyer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="lawyer-preview-info">
                  <p className="lawyer-preview-name">
                    <UserCheck size={14} /> {selectedLawyer.name}
                    <span className={`avail-dot avail-${selectedLawyer.availabilityStatus}`} />
                  </p>
                  <p className="lawyer-preview-meta">
                    <MapPin size={11} /> {selectedLawyer.city || 'Location N/A'}
                  </p>
                  <p className="lawyer-preview-meta">
                    <Star size={11} /> {(selectedLawyer.specialization || []).join(', ') || 'General Practice'}
                  </p>
                </div>
                <div className="lawyer-preview-fee">
                  <BadgeIndianRupee size={13} />
                  <span>{selectedLawyer.consultationFee || 0}</span>
                  <small>/ session</small>
                </div>
              </div>
            )}

            <div className="cr-divider" />

            {/* ── Step 2: Issue Summary ── */}
            <div className="cr-step">
              <span className="cr-step-num">2</span>
              <label className="cr-step-label">Describe Your Issue</label>
            </div>

            <div className="cr-textarea-wrap">
              <textarea
                className="input-field cr-textarea"
                rows={4}
                maxLength={500}
                placeholder="Briefly explain your legal concern so the lawyer can prepare..."
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
              />
              <span className={`cr-char-count ${issueSummary.length > 450 ? 'cr-char-warn' : ''}`}>
                {issueSummary.length} / 500
              </span>
            </div>

            <div className="cr-divider" />

            {/* ── Step 3: Preferred Mode ── */}
            <div className="cr-step">
              <span className="cr-step-num">3</span>
              <label className="cr-step-label">Preferred Contact Mode</label>
            </div>

            <div className="mode-selector">
              {[
                { value: 'chat',      label: 'Chat',      Icon: MessageCircle },
                { value: 'call',      label: 'Call',      Icon: Phone },
                { value: 'whatsapp', label: 'WhatsApp',  Icon: MessageSquare },
                { value: 'in-person',label: 'In Person', Icon: Users },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`mode-chip ${preferredMode === value ? 'mode-chip-active' : ''}`}
                  onClick={() => setPreferredMode(value)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <div className="cr-divider" />

            {/* ── Step 4: Time & Document ── */}
            <div className="cr-step">
              <span className="cr-step-num">4</span>
              <label className="cr-step-label">Schedule & Attach</label>
            </div>

            <div className="row-2" style={{ marginBottom: 0 }}>
              <div>
                <label className="input-label" style={{ marginTop: 0 }}>
                  <CalendarClock size={13} style={{ display:'inline', marginRight: 4 }} />
                  Preferred Time
                </label>
                <div className="cr-datetime-wrap">
                  <input
                    type="datetime-local"
                    className="input-field cr-datetime-input"
                    value={rawDateTime}
                    min={minDateTime}
                    onChange={(e) => {
                      setRawDateTime(e.target.value);
                      setPreferredTime(formatDateTime(e.target.value));
                    }}
                  />
                  {preferredTime && (
                    <span className="cr-datetime-preview">
                      <CalendarClock size={12} />
                      {preferredTime}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="input-label" style={{ marginTop: 0 }}>
                  <FileText size={13} style={{ display:'inline', marginRight: 4 }} />
                  Attach PDF (Optional)
                </label>
                <div className="cr-select-wrap">
                  <ChevronDown size={15} className="cr-select-icon" />
                  <select
                    className="input-field cr-select"
                    value={selectedDocumentId}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                  >
                    <option value="">No document</option>
                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id}>{doc.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="cr-divider" />

            {/* ── Submit ── */}
            <button
              className={`gradient-btn cr-submit-btn ${busy ? 'cr-submitting' : ''}`}
              onClick={handleCreateRequest}
              disabled={busy}
            >
              {busy ? (
                <><span className="cr-spinner" /> Submitting...</>
              ) : (
                <><Send size={16} /> Send Request</>  
              )}
            </button>

            {message && (
              <p className={`status-text cr-status ${message.toLowerCase().includes('success') ? 'cr-status-ok' : 'cr-status-err'}`}>
                {message}
              </p>
            )}
          </section>

          <section className="glass-card connect-card">
            <div className="requests-section-head">
              <h2 className="section-heading">My Consultation Requests</h2>
              {myRequests.length > 0 && (
                <span className="requests-count-badge">
                  {Math.min(visibleCount, myRequests.length)} / {myRequests.length}
                </span>
              )}
            </div>
            <div className="requests-list">
              {myRequests.length === 0 && <p className="empty-text">No consultation requests yet.</p>}
              {myRequests.slice(0, visibleCount).map((item) => (
                <div className="request-item" key={item._id}>
                  <div className="request-title">
                    {item.lawyerId?.name || 'Lawyer'} | {item.status}
                    {item.unreadCount > 0 && <span className="unread-pill">{item.unreadCount} new</span>}
                  </div>
                  <p className="request-summary">{item.issueSummary}</p>
                  <div className="request-meta">
                    <span><Clock size={14} /> {new Date(item.createdAt).toLocaleString()}</span>
                    <span>Mode: {item.preferredMode}</span>
                  </div>
                  {item.documentId?.title && (
                    <p className="request-doc">Attached PDF: {item.documentId.title}</p>
                  )}
                  {item.lawyerResponseNote && (
                    <p className="request-note">Lawyer Note: {item.lawyerResponseNote}</p>
                  )}
                  {(item.status === 'accepted' || item.status === 'in-progress') && (
                    <div className="request-actions">
                      {item.preferredMode === 'chat' && (
                        <button
                          className="outline-btn action-btn"
                          onClick={() => navigate(`/consultation-chat/${item._id}`)}
                        >
                          Open Chat
                        </button>
                      )}
                      {item.preferredMode === 'call' && (
                        <button
                          className="outline-btn action-btn"
                          onClick={() => openCallDialer(item.lawyerId)}
                        >
                          Call Now
                        </button>
                      )}
                      {item.preferredMode === 'whatsapp' && (
                        <button
                          className="outline-btn action-btn"
                          onClick={() => openWhatsAppForRequest(item)}
                        >
                          WhatsApp Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {myRequests.length > REQUESTS_PAGE_SIZE && (
              <div className="requests-pagination">
                {visibleCount < myRequests.length && (
                  <button
                    className="show-more-btn"
                    onClick={() => setVisibleCount((c) => c + REQUESTS_PAGE_SIZE)}
                  >
                    Show More ({myRequests.length - visibleCount} remaining)
                  </button>
                )}
                {visibleCount > REQUESTS_PAGE_SIZE && (
                  <button
                    className="show-less-btn"
                    onClick={() => setVisibleCount(REQUESTS_PAGE_SIZE)}
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
