import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, MessageSquare, ShieldAlert, FileText, Files, AlertTriangle, Search, ArrowRight, Clock, UserCheck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { documentsAPI } from '../api/axios';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('legalmind_name') || 'Guest';
  //  [NEW] Yaahn hum API se real documents store karenge!
  const [recentDocs, setRecentDocs] = useState([]);

  //  [NEW] Jab page khulega, sidhe API se purani uploads mangwayenge
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentsAPI.getAll();
        setRecentDocs(res.data); // MongoDB ka real data state me set kiya
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    };
    fetchDocs();
  }, []);

    const stats = [
    { icon: Files, label: 'Documents Uploaded', value: recentDocs.length || '0', color: 'var(--primary)' },
    { icon: AlertTriangle, label: 'Risk Alerts', value: recentDocs.length > 0 ? Math.floor(recentDocs.length * 0.8) : '0', color: 'var(--coral)' },
    { icon: Search, label: 'Searches Today', value: recentDocs.length > 0 ? recentDocs.length * 2 : '0', color: 'var(--teal)' },
  ];


  const actionCards = [
    {
      icon: Upload, title: 'Document Upload', desc: 'Upload and process legal documents (PDF)',
      color: 'var(--primary)', bgColor: 'rgba(103, 93, 249, 0.1)', borderColor: 'rgba(103, 93, 249, 0.2)', path: '/upload',
    },
    {
      icon: MessageSquare, title: 'Q&A Chatbot', desc: 'Ask questions about your legal documents',
      color: 'var(--teal)', bgColor: 'rgba(0, 217, 166, 0.1)', borderColor: 'rgba(0, 217, 166, 0.2)', path: '/chat',
    },
    {
      icon: UserCheck, title: 'Connect Lawyer', desc: 'Not satisfied with AI answer? Raise a request to a verified lawyer',
      color: 'var(--info)', bgColor: 'rgba(100, 181, 246, 0.1)', borderColor: 'rgba(100, 181, 246, 0.2)', path: '/connect-lawyer',
    },
    {
      icon: ShieldAlert, title: 'Risk Analyzer', desc: 'Analyze contracts for risks and compliance issues',
      color: 'var(--coral)', bgColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)', path: '/risk',
    },
    {
      icon: FileText, title: 'Document Summary', desc: 'Generate comprehensive summaries of legal documents',
      color: 'var(--amber)', bgColor: 'rgba(255, 181, 71, 0.1)', borderColor: 'rgba(255, 181, 71, 0.2)', path: '/summary',
    },
  ];

  const getRiskBadge = (score) => {
    if (score === null || score === undefined) return <span className="badge badge-info">Pending</span>;
    if (score >= 70) return <span className="badge badge-high">{score}</span>;
    if (score >= 40) return <span className="badge badge-medium">{score}</span>;
    return <span className="badge badge-low">{score}</span>;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 className="page-title">Welcome back, {userName} 👋</h1>
            <p className="page-subtitle">Here's an overview of your legal workspace</p>
          </div>
          <button className="gradient-btn" onClick={() => navigate('/upload')}>
            <Upload size={18} /> Quick Upload
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {stats.map((s, i) => (
            <div className="stat-card glass-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="stat-card-icon" style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={22} />
              </div>
              <div className="stat-card-info">
                <span className="stat-card-value">{s.value}</span>
                <span className="stat-card-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <h2 className="section-heading">Quick Actions</h2>
        <div className="action-cards-grid">
          {actionCards.map((card, i) => (
            <div className="action-card glass-card" key={i} onClick={() => navigate(card.path)} style={{ borderColor: card.borderColor, animationDelay: `${i * 0.1}s` }}>
              <div className="action-card-icon" style={{ background: card.bgColor, color: card.color }}>
                <card.icon size={28} />
              </div>
              <h3 className="action-card-title">{card.title}</h3>
              <p className="action-card-desc">{card.desc}</p>
              <span className="action-card-arrow" style={{ color: card.color }}>
                <ArrowRight size={18} />
              </span>
            </div>
          ))}
        </div>

        {/* Recent Documents */}
        <h2 className="section-heading">Recent Documents (Real Data 🔥)</h2>
        <div className="recent-table-wrap glass-card">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Date</th>
                <th>Status</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.length > 0 ? recentDocs.map((doc, i) => (
                <tr key={i}>
                  <td className="doc-name">
                    <FileText size={16} className="doc-icon" />
                    {doc.title}
                  </td>
                  <td className="doc-date">
                    <Clock size={14} /> {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge ${doc.status === 'Ingested' ? 'badge-low' : 'badge-info'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>{getRiskBadge(doc.riskScore)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{textAlign: "center", padding: "20px", color: "var(--text-secondary)"}}>
                    Koi file upload nahi ki abhi tak!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
