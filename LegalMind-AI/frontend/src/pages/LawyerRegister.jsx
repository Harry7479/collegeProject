import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Upload, FileText, CheckCircle, AlertCircle, X, KeyRound } from 'lucide-react';
import { lawyerAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import './LawyerLogin.css';
import './LawyerRegister.css';

const DOC_TYPES = [
  { value: 'bar_council_certificate', label: 'Bar Council Certificate', required: true },
  { value: 'id_proof', label: 'Government ID Proof (Aadhaar / PAN / Passport)', required: true },
  { value: 'degree_certificate', label: 'Law Degree Certificate (LLB/LLM)', required: false },
];

export default function LawyerRegisterPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // ── Step 1 state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsappNumber: '',
    specialization: '',
    barCouncilId: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // After step-1 registration succeeds we store the token temporarily
  const [lawyerToken, setLawyerToken] = useState('');

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [docEntries, setDocEntries] = useState([
    { docType: 'bar_council_certificate', file: null },
    { docType: 'id_proof', file: null },
  ]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const addDocEntry = () => {
    if (docEntries.length < 5) {
      setDocEntries((p) => [...p, { docType: 'degree_certificate', file: null }]);
    }
  };

  const removeDocEntry = (idx) => {
    setDocEntries((p) => p.filter((_, i) => i !== idx));
  };

  const setDocEntryFile = (idx, file) => {
    setDocEntries((p) => p.map((e, i) => (i === idx ? { ...e, file } : e)));
  };

  const setDocEntryType = (idx, docType) => {
    setDocEntries((p) => p.map((e, i) => (i === idx ? { ...e, docType } : e)));
  };

  // ── Step 1: Register ──────────────────────────────────────────────────────
  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await lawyerAPI.register(form);
      addToast('Account created! Please verify your email OTP.', 'success');
      setShowOtpModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    try {
      await lawyerAPI.verifyOTP(form.email, otp);
      addToast('Email verified! Now upload your verification documents.', 'success');
      setShowOtpModal(false);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Invalid OTP.';
      addToast(msg, 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Step 2: Upload ────────────────────────────────────────────────────────
  const handleUploadSubmit = async (event) => {
    event.preventDefault();

    const hasRequired = docEntries.some(
      (e) => e.docType === 'bar_council_certificate' && e.file
    ) && docEntries.some(
      (e) => e.docType === 'id_proof' && e.file
    );

    if (!hasRequired) {
      addToast('Please upload at least your Bar Council Certificate and ID Proof', 'error');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      const docTypes = [];

      for (const entry of docEntries) {
        if (entry.file) {
          formData.append('verificationDocs', entry.file);
          docTypes.push(entry.docType);
        }
      }

      formData.append('docTypes', JSON.stringify(docTypes));

      await lawyerAPI.uploadVerificationDocs(formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });

      addToast('Documents uploaded! Your account is under review. Login once approved.', 'success');
      // Clear the temp token — lawyer can't log in until approved anyway
      localStorage.removeItem('legalmind_lawyer_token');
      setTimeout(() => navigate('/lawyer/login'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Document upload failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const skipUpload = () => {
    localStorage.removeItem('legalmind_lawyer_token');
    addToast('Registration submitted. Upload your proof documents after login to speed up approval.', 'info');
    navigate('/lawyer/login');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="auth-wrapper">
      <form
        className="glass-card auth-card lawyer-register-card"
        onSubmit={step === 1 ? handleRegisterSubmit : handleUploadSubmit}
        encType={step === 2 ? 'multipart/form-data' : undefined}
      >
        {/* Brand */}
        <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Shield size={24} className="auth-brand-icon" />
          <span>LegalMind<span className="brand-ai">AI</span></span>
        </div>

        {/* Step indicator */}
        <div className="register-steps">
          <div className={`step-dot ${step >= 1 ? 'step-active' : ''}`}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'step-active' : ''}`}>2</div>
        </div>

        {step === 1 && (
          <>
            <h1 className="auth-title">Lawyer Sign Up</h1>
            <p className="auth-subtitle">Step 1 of 2 — Basic Information</p>

            <input
              className="input-field"
              type="text"
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
            <input
              className="input-field"
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="Password *"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
            <input
              className="input-field"
              type="text"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
            <input
              className="input-field"
              type="text"
              placeholder="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(e) => handleChange('whatsappNumber', e.target.value)}
            />
            <input
              className="input-field"
              type="text"
              placeholder="Specialization (comma separated)"
              value={form.specialization}
              onChange={(e) => handleChange('specialization', e.target.value)}
            />
            <input
              className="input-field"
              type="text"
              placeholder="Bar Council Enrollment ID *"
              value={form.barCouncilId}
              onChange={(e) => handleChange('barCouncilId', e.target.value)}
              required
            />
            <input
              className="input-field"
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />

            {error && (
              <p className="auth-error">
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                {error}
              </p>
            )}

            <button className="gradient-btn auth-btn" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Continue →'}
            </button>

            <p className="auth-subtitle" style={{ marginTop: 4 }}>
              Already registered? <Link to="/lawyer/login">Lawyer Login</Link>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="auth-title">Upload Verification Docs</h1>
            <p className="auth-subtitle">Step 2 of 2 — Required for admin to verify your identity</p>

            <div className="verify-info-box">
              <AlertCircle size={16} />
              <span>
                Admin will review these documents to confirm you are a licensed lawyer.
                Without valid documents, approval may be delayed or rejected.
              </span>
            </div>

            <div className="doc-upload-list">
              {docEntries.map((entry, idx) => (
                <div key={idx} className="doc-upload-row">
                  <select
                    className="input-field doc-type-select"
                    value={entry.docType}
                    onChange={(e) => setDocEntryType(idx, e.target.value)}
                  >
                    {DOC_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>

                  <label className="doc-file-label">
                    {entry.file ? (
                      <span className="doc-file-chosen">
                        <CheckCircle size={14} style={{ color: '#22c55e' }} />
                        {entry.file.name.length > 28
                          ? `${entry.file.name.slice(0, 25)}...`
                          : entry.file.name}
                      </span>
                    ) : (
                      <span className="doc-file-placeholder">
                        <Upload size={14} />
                        Choose file (PDF / JPG / PNG)
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => setDocEntryFile(idx, e.target.files[0] || null)}
                    />
                  </label>

                  {docEntries.length > 2 && (
                    <button
                      type="button"
                      className="doc-remove-btn"
                      onClick={() => removeDocEntry(idx)}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {docEntries.length < 5 && (
              <button type="button" className="outline-btn add-doc-btn" onClick={addDocEntry}>
                <FileText size={14} /> Add Another Document
              </button>
            )}

            {uploading && (
              <div className="upload-progress-wrap">
                <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                <span className="upload-progress-label">{uploadProgress}%</span>
              </div>
            )}

            {error && (
              <p className="auth-error">
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                {error}
              </p>
            )}

            <button className="gradient-btn auth-btn" type="submit" disabled={uploading}>
              {uploading ? `Uploading... ${uploadProgress}%` : 'Submit for Verification'}
            </button>

            <button
              type="button"
              className="skip-btn"
              onClick={skipUpload}
              disabled={uploading}
            >
              Skip for now (upload after login)
            </button>
          </>
        )}
      </form>
    </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-card popup-card">
            <button className="modal-close" onClick={() => setShowOtpModal(false)}>
              <X size={20} />
            </button>
            <div className="modal-header">
              <Shield size={28} className="modal-icon" />
              <h2>Verify Email</h2>
            </div>
            <p className="modal-subtitle">Enter the 6-digit OTP sent to <strong>{form.email}</strong></p>
            <form onSubmit={handleVerifyOtp} className="auth-form" style={{ marginTop: '1.5rem' }}>
              <div className="input-group">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="text"
                  className="input-field input-with-icon"
                  placeholder="Enter OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
              <button type="submit" className="gradient-btn auth-submit" disabled={verifyLoading || otp.length < 6}>
                {verifyLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
