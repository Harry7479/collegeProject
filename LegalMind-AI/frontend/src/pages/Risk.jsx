import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { documentsAPI, riskAPI } from '../api/axios';
import './Risk.css';

export default function RiskPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoadFailed, setPdfLoadFailed] = useState(false);

  // 1. Pehle saari upload documents khincho DB se
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentsAPI.getAll();
        setDocuments(res.data);
        if (res.data.length > 0) {
          setSelectedDoc(res.data[0]._id); // Pehla document by default
        }
      } catch (error) {
        console.error("Doc fetch error", error);
      }
    };
    fetchDocs();
  }, []);

  // 2. Jaise hi 'selectedDoc' change ho, uska asli Risk scan Python se mangwao!
  useEffect(() => {
    const analyzeRisk = async () => {
      if (!selectedDoc) return;
      setLoading(true);
      try {
        const res = await riskAPI.analyze(selectedDoc);
        setRiskData(res.data); // Asli Risk Score aur array set ho gaya
      } catch (error) {
        console.error("Risk Fetch Error", error);
        setRiskData(null);
      } finally {
        setLoading(false);
      }
    };
    analyzeRisk();
  }, [selectedDoc]);

  // Variables nikal lo agar API result aaya hai
  // Data extraction path fixed for Python JSON match
  const findings = riskData?.risk_findings || [];

  // Custom Score Mapping logic based on AI Severity output
  const scoreMap = { high: 85, medium: 45, low: 15 };
  const riskScore = findings.length > 0 ? (scoreMap[findings[0].severity.toLowerCase()] || 0) : 0;


  const activeDocName = documents.find(d => d._id === selectedDoc)?.title || 'Loading...';
  const activeFileUrl = documents.find(d => d._id === selectedDoc)?.fileUrl;

  useEffect(() => {
    setPdfLoadFailed(false);
  }, [selectedDoc]);

  // UI styling functions
  const getSeverityConfig = (s) => {
    if (!s) return { label: 'Unknown', color: 'gray', bg: '#eee', icon: CheckCircle };
    const level = s.toLowerCase();
    if (level === 'high') return { label: 'High Risk', color: 'var(--coral)', bg: 'rgba(255,107,107,0.12)', icon: AlertCircle };
    if (level === 'medium') return { label: 'Medium Risk', color: 'var(--amber)', bg: 'rgba(255,181,71,0.12)', icon: AlertTriangle };
    return { label: 'Low Risk', color: 'var(--teal)', bg: 'rgba(0,217,166,0.12)', icon: CheckCircle };
  };

  const getGaugeColor = () => {
    if (riskScore >= 70) return 'var(--coral)';
    if (riskScore >= 40) return 'var(--amber)';
    return 'var(--teal)';
  };

  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title animate-fade-in">Risk Analyzer</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: 32 }}>
          <p className="page-subtitle">Contract risk assessment for:</p>
          <select
            className="input-field"
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            style={{ width: '300px', cursor: 'pointer' }}
          >
            {documents.length > 0 ? (
              documents.map(d => <option key={d._id} value={d._id}>{d.title}</option>)
            ) : (
              <option value="">No PDF Uploaded Yet</option>
            )}
          </select>
        </div>

        <div className="risk-layout">
          {/* Left - PDF Preview placeholder */}
          <div className="risk-pdf-panel glass-card">
            <div className="pdf-header">
              <FileText size={18} />
              <span>{activeDocName}</span>
            </div>
            {/* Visuals */}
            <div className="pdf-preview" style={{ padding: 0, height: '450px', overflow: 'hidden' }}>
              {activeFileUrl ? (
                pdfLoadFailed ? (
                  <div style={{ color: 'var(--on-surface-variant)', padding: '24px', textAlign: 'center' }}>
                    PDF preview blocked by storage provider.
                    <div style={{ marginTop: '12px' }}>
                      <a href={activeFileUrl} target="_blank" rel="noreferrer" className="outline-btn" style={{ display: 'inline-block' }}>
                        Open PDF in New Tab
                      </a>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={activeFileUrl}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                    title="Document Preview"
                    onError={() => setPdfLoadFailed(true)}
                  />
                )
              ) : (
                <div style={{ color: 'gray', padding: '30px', textAlign: 'center' }}>PDF File not found on server</div>
              )}
            </div>

          </div>

          {/* Right - Score */}
          <div className="risk-results-panel">
            {loading ? (
              <h3 style={{ color: 'purple', textAlign: 'center', marginTop: '100px' }}>AI Engine is Analyzing PDF... 🤖</h3>
            ) : riskData ? (
              <>
                <div className="risk-gauge-card glass-card">
                  <div className="gauge-wrap">
                    <svg viewBox="0 0 160 160" className="gauge-svg">
                      <circle cx="80" cy="80" r="70" className="gauge-track" />
                      <circle cx="80" cy="80" r="70" className="gauge-fill" style={{ stroke: getGaugeColor(), strokeDasharray: circumference, strokeDashoffset: dashOffset }} />
                    </svg>
                    <div className="gauge-center">
                      <span className="gauge-value" style={{ color: getGaugeColor() }}>{riskScore}</span>
                      <span className="gauge-label">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="findings-list">
                  {findings.map((f, i) => {
                    const cfg = getSeverityConfig(f.severity);
                    return (
                      <div className="finding-card glass-card" key={i}>
                        <div className="finding-header">
                          <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                            <cfg.icon size={12} style={{ marginRight: 4 }} />
                            {cfg.label}
                          </span>
                        </div>
                        <blockquote className="finding-clause">{f.clause}</blockquote>
                        <p className="finding-explanation"><strong>Risk:</strong> {f.explanation}</p>
                        <p className="finding-recommendation"><strong>Recommendation:</strong> {f.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p>No Risk Report Available</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
