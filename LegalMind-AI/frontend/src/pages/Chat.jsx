import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Bot, User, Mic, MicOff, CheckCheck, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import { documentsAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import './Chat.css';

const formatTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatPage() {
  const { addToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [documents, setDocuments] = useState([]); // 🔥 API documents aayenge yaha
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I\'m your AI legal assistant. Select a document and ask me any questions about its contents. I\'ll provide answers with specific citations.',
      sources: [],
      time: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // 🔥 [NEW] Page khulte hi database se tumhari files mangwayega
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentsAPI.getAll();
        setDocuments(res.data);
        if (res.data.length > 0) {
          // By default pehli file chun lo
          setSelectedDoc(res.data[0]._id); 
        }
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('legalmind_token');
    if (!token) {
      addToast('Please login first to start realtime chat.', 'error');
      return undefined;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketBase = import.meta.env.VITE_SOCKET_URL || apiBase.replace(/\/api\/?$/, '');

    const socket = io(socketBase, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketReady(true);
    });

    socket.on('disconnect', () => {
      setSocketReady(false);
    });

    socket.on('connect_error', () => {
      setSocketReady(false);
      addToast('Realtime chat server connect nahi hua. Backend check karo.', 'error');
    });

    socket.on('chat:error', (payload) => {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: payload?.message || 'Something went wrong during realtime chat.',
          sources: [],
          confidence: 0,
          time: new Date().toISOString(),
        },
      ]);
    });

    socket.on('chat:response', (payload) => {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: payload?.answer || 'No answer generated.',
          sources: payload?.sources || [],
          confidence: payload?.confidence || 0,
          time: new Date().toISOString(),
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addToast]);

  useEffect(() => {
    if (!selectedDoc || !socketRef.current || !socketReady) return;
    socketRef.current.emit('chat:join', { documentId: selectedDoc });
  }, [selectedDoc, socketReady]);

    const handleVoiceInput = () => {
    // Check agar browser support karta hai
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tumhara browser speech recognition support nahi karta, please Chrome use karo.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // English (India) ke accent ko ache se smjhega
    recognition.interimResults = false; 

    // Jab mic on ho...
    recognition.onstart = () => {
      setIsListening(true);
    };

    // Jab tu bolna band karde aur result aaye...
    recognition.onresult = (event) => {
      // Jo bola wo Text ban gaya!
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Jo bhi pehle se search bar me likha hai, uske aage voice ka text jod do
      setInput((prev) => prev + " " + transcript);
    };

    // Jab mic automatically band ho jaye...
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedDoc) return;
    if (!socketRef.current || !socketReady) {
      addToast('Socket connected nahi hai. Backend start karke dobara try karo.', 'error');
      return;
    }

    const question = input.trim();
    const clientMessageId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question, time: new Date().toISOString() }]);
    setLoading(true);

    socketRef.current.emit('chat:message', {
      documentId: selectedDoc,
      question,
      clientMessageId,
    });
  };

  // Jo file user ne chuni hai uska naam filter karna
  const activeDocName = documents.find(d => d._id === selectedDoc)?.title || 'Select a document';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content chat-main">
        <aside className="chat-sidebar glass-card">
          <div className="chat-sidebar-section">
            <h3 className="chat-sidebar-title">Document</h3>
            <select
              className="input-field doc-select"
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              {documents.length > 0 ? (
                documents.map(d => <option key={d._id} value={d._id}>{d.title}</option>)
              ) : (
                <option value="">No files uploaded yet</option>
              )}
            </select>
          </div>
        </aside>

        <div className="chat-area">
          <div className="chat-header glass">
            <div className="chat-header-avatar">
              <Bot size={18} />
            </div>
            <div className="chat-header-meta">
              <p className="chat-header-title">LegalMind Assistant</p>
              <p className="chat-header-subtitle">
                <ShieldCheck size={14} />
                {socketReady ? 'Encrypted realtime connection' : 'Connecting...'}
              </p>
            </div>
            <div className="chat-header-doc">
              <FileText size={16} className="chat-header-icon" />
              <span>{activeDocName}</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div className={`chat-bubble ${msg.role}`} key={i}>
                <div className="bubble-avatar">
                  {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="bubble-content">
                  <p className="bubble-text">{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="bubble-sources">
                      {msg.sources.map((s, j) => (
                        <span className="source-pill" key={j}>{s.label}</span>
                      ))}
                    </div>
                  )}
                  <div className="bubble-meta">
                    <span>{formatTime(msg.time)}</span>
                    {msg.role === 'user' && <CheckCheck size={14} />}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble assistant">
                <div className="bubble-avatar"><Bot size={18} /></div>
                <div className="bubble-content">
                  <div className="typing-indicator"><span /><span /><span /></div>
                  <div className="bubble-meta"><span>typing...</span></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-bar glass">
            <input
              type="text"
              className="chat-input"
              placeholder={documents.length > 0 ? "Ask or speak about your document..." : "Upload a document first..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={documents.length === 0}
            />

            <button
              type="button"
              className={`voice-btn ${isListening ? 'voice-btn-live' : ''}`}
              onClick={handleVoiceInput}
              disabled={documents.length === 0}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button className="gradient-btn send-btn" onClick={handleSend} disabled={loading || documents.length === 0}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
