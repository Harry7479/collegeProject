import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Shield, KeyRound, X } from 'lucide-react';
import { authAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const { addToast } = useToast();

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return { level: 0, text: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { level: 25, text: 'Weak', color: 'var(--coral)' },
      { level: 50, text: 'Fair', color: 'var(--amber)' },
      { level: 75, text: 'Good', color: 'var(--info)' },
      { level: 100, text: 'Strong', color: 'var(--teal)' },
    ];
    return levels[score - 1] || { level: 0, text: '', color: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      addToast('Passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register({ name: form.name, email: form.email, password: form.password });
      addToast('OTP sent to your email. Please verify.', 'success');
      setShowOtpModal(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    try {
      await authAPI.verifyOTP(form.email, otp);
      addToast('Email verified successfully! You can now login.', 'success');
      setShowOtpModal(false);
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed. Invalid OTP.';
      addToast(message, 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-orb-1" />
      <div className="auth-bg-orb auth-orb-2" />

      <div className="auth-card glass-card animate-fade-in">
        <div className="auth-brand" onClick={() => navigate('/')}>
          <Shield size={28} className="auth-brand-icon" />
          <span>LegalMind<span className="brand-ai">AI</span></span>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the future of legal intelligence</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              type="text"
              className="input-field input-with-icon"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

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

          {form.password && (
            <div className="password-strength">
              <div className="strength-bar">
                <div className="strength-fill" style={{ width: `${strength.level}%`, background: strength.color }} />
              </div>
              <span className="strength-text" style={{ color: strength.color }}>{strength.text}</span>
            </div>
          )}

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              className="input-field input-with-icon"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          <label className="remember-me" style={{ marginBottom: 8 }}>
            <input type="checkbox" required />
            <span>I agree to the <a href="#">Terms & Conditions</a></span>
          </label>

          <button type="submit" className="gradient-btn auth-submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>

      {showOtpModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-card popup-card">
            <button className="modal-close" onClick={() => setShowOtpModal(false)}>
              <X size={20} />
            </button>
            <div className="modal-header">
              <Shield size={28} className="modal-icon text-teal" />
              <h2>Verify Email</h2>
            </div>
            <p className="modal-subtitle">Enter the 6-digit OTP sent to {form.email}</p>
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
                {verifyLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
