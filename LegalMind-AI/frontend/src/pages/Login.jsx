import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Shield, CheckCircle2, KeyRound, X, RefreshCw } from 'lucide-react';
import { authAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // ---- Forgot Password State ----
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=newpass
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(form.email, form.password);
      localStorage.setItem('legalmind_token', res.data.token);
      localStorage.setItem('legalmind_name', res.data.name);
      localStorage.setItem('legalmind_email', res.data.email);

      addToast('Login successful', 'success');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send Reset OTP
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await authAPI.sendResetOTP(forgotEmail);
      setSessionToken(res.data.sessionToken);
      addToast('OTP sent to your email.', 'success');
      setForgotStep(2);
    } catch (err) {
      const message = err.response?.data?.msg || 'Could not send OTP. Please check your email.';
      addToast(message, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify Reset OTP
  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await authAPI.verifyResetOTP(forgotOtp, sessionToken);
      setSessionToken(res.data.sessionToken);
      addToast('OTP verified!', 'success');
      setForgotStep(3);
    } catch (err) {
      const message = err.response?.data?.msg || 'Invalid OTP. Please try again.';
      addToast(message, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      await authAPI.resetPassword(newPassword, sessionToken);
      addToast('Password reset successfully! Please login.', 'success');
      closeForgotModal();
    } catch (err) {
      const message = err.response?.data?.msg || 'Failed to reset password.';
      addToast(message, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setSessionToken('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const stepTitles = ['Forgot Password', 'Enter OTP', 'New Password'];
  const stepSubtitles = [
    'Enter your registered email to receive an OTP.',
    `Enter the 6-digit OTP sent to ${forgotEmail}`,
    'Create a new secure password.',
  ];

  return (
    <div className="auth-page login-page">
      <div className="auth-bg-orb auth-orb-1" />
      <div className="auth-bg-orb auth-orb-2" />

      <div className="login-shell glass-card animate-fade-in">
        <section className="login-visual">
          <img
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80"
            alt="Modern legal workspace"
            className="login-visual-image"
          />
          <div className="login-visual-overlay" />
          <div className="login-visual-content">
            <p className="login-visual-kicker">Secure Legal Workspace</p>
            <h2>Find Answers Faster With AI + Verified Lawyers</h2>
            <p>
              Access case summaries, document insights, and private lawyer consultations from one dashboard.
            </p>
            <div className="login-feature-list">
              <div className="login-feature-item">
                <CheckCircle2 size={16} />
                <span>Encrypted chat and document safety</span>
              </div>
              <div className="login-feature-item">
                <CheckCircle2 size={16} />
                <span>Instant AI answers with human fallback</span>
              </div>
              <div className="login-feature-item">
                <CheckCircle2 size={16} />
                <span>Role-based dashboards for users and lawyers</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card login-auth-card">
          <div className="auth-brand" onClick={() => navigate('/')}>
            <Shield size={28} className="auth-brand-icon" />
            <span>LegalMind<span className="brand-ai">AI</span></span>
          </div>

          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue your legal research</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                className="input-field input-with-icon"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <Lock size={18} className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field input-with-icon"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-extras">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => setShowForgot(true)}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="gradient-btn auth-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </section>
      </div>

      {/* ---- Forgot Password Modal ---- */}
      {showForgot && (
        <div className="modal-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && closeForgotModal()}>
          <div className="modal-content glass-card popup-card">
            <button className="modal-close" onClick={closeForgotModal}>
              <X size={20} />
            </button>

            {/* Step Indicator */}
            <div className="forgot-steps">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`forgot-step-dot ${forgotStep >= s ? 'active' : ''}`} />
              ))}
            </div>

            <div className="modal-header">
              <KeyRound size={28} className="modal-icon" />
              <h2>{stepTitles[forgotStep - 1]}</h2>
            </div>
            <p className="modal-subtitle">{stepSubtitles[forgotStep - 1]}</p>

            {/* Step 1: Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetOtp} className="auth-form" style={{ marginTop: '1.5rem' }}>
                <div className="input-group">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="input-field input-with-icon"
                    placeholder="Registered email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="gradient-btn auth-submit" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyResetOtp} className="auth-form" style={{ marginTop: '1.5rem' }}>
                <div className="input-group">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type="text"
                    className="input-field input-with-icon"
                    placeholder="Enter 6-digit OTP"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    required
                    maxLength={6}
                  />
                </div>
                <button type="submit" className="gradient-btn auth-submit" disabled={forgotLoading || forgotOtp.length < 6}>
                  {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" className="forgot-resend-btn" onClick={() => setForgotStep(1)}>
                  <RefreshCw size={14} /> Resend OTP
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="auth-form" style={{ marginTop: '1.5rem' }}>
                <div className="input-group">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field input-with-icon"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowNewPass(!showNewPass)}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="input-group">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="input-field input-with-icon"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="gradient-btn auth-submit" disabled={forgotLoading}>
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
