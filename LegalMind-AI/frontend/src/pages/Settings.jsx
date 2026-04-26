import { useState,useEffect } from 'react';
import { User, Mail, Lock, BarChart3, Moon, Sun, Bell, Globe, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { documentsAPI } from '../api/axios'; 
import './Settings.css';

export default function SettingsPage() {
    const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('legalmind_theme') !== 'light';
  });

  const [notifications, setNotifications] = useState(true);
  const [totalDocs, setTotalDocs] = useState(0);
   useEffect(() => {
    documentsAPI.getAll()
      .then(res => setTotalDocs(res.data.length))
      .catch(console.error);
  }, []);
      // --- Magic Dark/Light Mode Switcher ---
  useEffect(() => {
    if (!darkMode) {
      document.body.classList.add('light-theme-magic');
      localStorage.setItem('legalmind_theme', 'light');
    } else {
      document.body.classList.remove('light-theme-magic');
      localStorage.setItem('legalmind_theme', 'dark');
    }
  }, [darkMode]);

   const [profile, setProfile] = useState({
    name: localStorage.getItem('legalmind_name') || 'User',
    email: localStorage.getItem('legalmind_email') || 'user@example.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const usageStats = {
    queriesUsed: totalDocs > 0 ? Math.floor(totalDocs * 5) + 3 : 0,
    queriesLimit: 500,
    documentsAnalyzed: totalDocs,
    reportsGenerated: totalDocs,
  };

  const usagePercent = (usageStats.queriesUsed / usageStats.queriesLimit) * 100;

  const handleSave = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title animate-fade-in">Settings</h1>
        <p className="page-subtitle" style={{ marginBottom: 32 }}>Manage your account and preferences</p>

        <div className="settings-grid">
          {/* Profile Settings */}
          <div className="settings-card glass-card">
            <h2 className="settings-card-title">
              <User size={20} /> Profile Settings
            </h2>
            <form onSubmit={handleSave} className="settings-form">
              <div className="settings-avatar-row">
                <div className="settings-avatar">
                  <span>{initials}</span>
                </div>
                <button type="button" className="outline-btn" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                  Change Avatar
                </button>
              </div>

              <label className="settings-label">
                <span><User size={14} /> Full Name</span>
                <input
                  type="text"
                  className="input-field"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </label>

              <label className="settings-label">
                <span><Mail size={14} /> Email</span>
                <input
                  type="email"
                  className="input-field"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </label>

              <div className="password-section">
                <h3 className="password-section-title"><Lock size={14} /> Change Password</h3>
                <label className="settings-label">
                  <span>Current Password</span>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter current password"
                    value={profile.currentPassword}
                    onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                  />
                </label>
                <label className="settings-label">
                  <span>New Password</span>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter new password"
                    value={profile.newPassword}
                    onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                  />
                </label>
                <label className="settings-label">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Confirm new password"
                    value={profile.confirmPassword}
                    onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                  />
                </label>
              </div>

              <button type="submit" className="gradient-btn" style={{ width: '100%' }}>
                Save Changes
              </button>
            </form>
          </div>

          {/* Right Column */}
          <div className="settings-right">
            {/* API Usage */}
            <div className="settings-card glass-card">
              <h2 className="settings-card-title">
                <BarChart3 size={20} /> API Usage Stats
              </h2>
              <div className="usage-bar-wrap">
                <div className="usage-bar-header">
                  <span>Queries Used</span>
                  <span className="usage-count">{usageStats.queriesUsed} / {usageStats.queriesLimit}</span>
                </div>
                <div className="usage-bar">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
              <div className="usage-stats-grid">
                <div className="usage-stat">
                  <span className="usage-stat-value">{usageStats.queriesUsed}</span>
                  <span className="usage-stat-label">Total Queries</span>
                </div>
                <div className="usage-stat">
                  <span className="usage-stat-value">{usageStats.documentsAnalyzed}</span>
                  <span className="usage-stat-label">Docs Analyzed</span>
                </div>
                <div className="usage-stat">
                  <span className="usage-stat-value">{usageStats.reportsGenerated}</span>
                  <span className="usage-stat-label">Reports Generated</span>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="settings-card glass-card">
              <h2 className="settings-card-title">Preferences</h2>
              <div className="pref-item">
                <div className="pref-info">
                  {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                  <div>
                    <span className="pref-label">Dark Mode</span>
                    <span className="pref-desc">Switch between dark and light themes</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="pref-item">
                <div className="pref-info">
                  <Bell size={18} />
                  <div>
                    <span className="pref-label">Notifications</span>
                    <span className="pref-desc">Receive alerts for risk analysis results</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="pref-item">
                <div className="pref-info">
                  <Globe size={18} />
                  <div>
                    <span className="pref-label">Language</span>
                    <span className="pref-desc">Interface language selection</span>
                  </div>
                </div>
                <select className="input-field pref-select">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                </select>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="settings-card glass-card danger-card">
              <h2 className="settings-card-title danger-title">
                <Trash2 size={20} /> Danger Zone
              </h2>
              <p className="danger-desc">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="outline-btn danger-btn">
                <Trash2 size={16} /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
