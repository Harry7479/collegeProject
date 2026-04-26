import { useState, useRef } from 'react';
import { CloudUpload, File, CheckCircle, Loader, X, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { documentsAPI } from '../api/axios';
import './Upload.css';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    addFiles(dropped);
  };

  const addFiles = (newFiles) => {
    const entries = newFiles.map(f => ({
      file: f,
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(2),
      progress: 0,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...entries]);
    entries.forEach((entry, i) => uploadFile(entry, files.length + i));
  };

  const uploadFile = async (entry, index) => {
    try {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading' } : f));
      await documentsAPI.upload(entry.file, (e) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: pct } : f));
      });
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'done', progress: 100 } : f));
    } catch {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error' } : f));
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title animate-fade-in">Upload Document</h1>
        <p className="page-subtitle" style={{ marginBottom: 32 }}>Upload your legal documents for AI-powered analysis</p>

        {/* Drop Zone */}
        <div
          className={`drop-zone glass-card ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <input
            type="file"
            ref={fileRef}
            accept=".pdf"
            multiple
            hidden
            onChange={(e) => addFiles(Array.from(e.target.files))}
          />
          <CloudUpload size={48} className="drop-icon" />
          <h3 className="drop-title">Drag & drop your PDF files here</h3>
          <p className="drop-subtitle">or click to browse files</p>
          <span className="drop-hint">Supports PDF files up to 50MB</span>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="upload-list">
            <h2 className="section-heading">Uploads</h2>
            {files.map((f, i) => (
              <div className="upload-item glass-card" key={i}>
                <div className="upload-item-icon">
                  <FileText size={20} />
                </div>
                <div className="upload-item-info">
                  <span className="upload-item-name">{f.name}</span>
                  <span className="upload-item-size">{f.size} MB</span>
                  {f.status === 'uploading' && (
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>
                <div className="upload-item-status">
                  {f.status === 'pending' && <Loader size={18} className="spin" />}
                  {f.status === 'uploading' && <span className="upload-pct">{f.progress}%</span>}
                  {f.status === 'done' && <CheckCircle size={18} className="status-done" />}
                  {f.status === 'error' && <span className="status-error">Failed</span>}
                </div>
                <button className="upload-remove" onClick={() => removeFile(i)}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
