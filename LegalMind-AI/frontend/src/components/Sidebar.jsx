import { createElement } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, MessageSquare, ShieldAlert, FileText, Settings, LogOut, Scale, UserCheck } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('legalmind_token');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/connect-lawyer', icon: UserCheck, label: 'Connect Lawyer' },
    { to: '/risk', icon: ShieldAlert, label: 'Risk Analyzer' },
    { to: '/summary', icon: FileText, label: 'Summary' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
        <Scale size={28} className="brand-icon" />
        <span className="brand-text">LegalMind<span className="brand-ai">AI</span></span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {createElement(icon, { size: 20 })}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
