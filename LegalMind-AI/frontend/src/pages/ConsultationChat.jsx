import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, Send } from 'lucide-react';
import { lawyerAPI } from '../api/axios';
import { useToast } from '../components/toastContext';
import { playNotificationTone, startTitleBlink } from '../utils/realtimeNotify';
import './ConsultationChat.css';

export default function ConsultationChatPage({ actor = 'user' }) {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [peerName, setPeerName] = useState('');
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const blinkStopRef = useRef(null);

  const tokenKey = actor === 'lawyer' ? 'legalmind_lawyer_token' : 'legalmind_token';
  const token = useMemo(() => localStorage.getItem(tokenKey), [tokenKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const historyPromise = actor === 'lawyer'
          ? lawyerAPI.getLawyerConsultationMessages(requestId)
          : lawyerAPI.getUserConsultationMessages(requestId);

        const requestListPromise = actor === 'lawyer'
          ? lawyerAPI.adminRequests()
          : lawyerAPI.myRequests();

        const [res, requestsRes] = await Promise.all([historyPromise, requestListPromise]);
        setMessages(res.data?.messages || []);

        const activeRequest = (requestsRes.data || []).find((item) => item._id === requestId);
        if (activeRequest) {
          setChatEnabled(!['rejected', 'cancelled', 'completed'].includes(activeRequest.status));
          // Show peer name: lawyer sees client name, client sees lawyer name
          if (actor === 'lawyer') {
            setPeerName(activeRequest.userId?.name || 'Client');
          } else {
            setPeerName(activeRequest.lawyerId?.name || 'Lawyer');
          }
        }
      } catch (error) {
        const finalMessage = error.response?.data?.message || 'Unable to load chat history';
        addToast(finalMessage, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [actor, requestId, addToast]);

  useEffect(() => {
    if (!token) {
      addToast('Please login again.', 'error');
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
      socket.emit('consultation:join', { consultationId: requestId });
    });

    socket.on('disconnect', () => {
      setSocketReady(false);
    });

    socket.on('consultation:message', (payload) => {
      setMessages((prev) => [...prev, payload]);
      if (payload?.senderType !== actor) {
        playNotificationTone();
        if (document.hidden && !blinkStopRef.current) {
          blinkStopRef.current = startTitleBlink('New consultation message');
        }
        setIsPeerTyping(false);
      }
    });

    socket.on('consultation:typing', (payload) => {
      if (!payload || payload.senderType === actor) return;
      setIsPeerTyping(Boolean(payload.isTyping));
    });

    socket.on('consultation:status-updated', (payload) => {
      if (payload?.consultationId !== requestId) return;

      const nextStatus = payload?.status;
      const enabled = !['rejected', 'cancelled', 'completed'].includes(nextStatus);
      setChatEnabled(enabled);

      if (nextStatus === 'accepted' || nextStatus === 'in-progress') {
        addToast('Consultation chat is now active.', 'success');
      }
      if (!enabled) {
        addToast(`Chat disabled: consultation is ${nextStatus}.`, 'info');
      }
    });

    socket.on('consultation:error', (payload) => {
      addToast(payload?.message || 'Consultation chat error', 'error');
    });

    socket.on('connect_error', () => {
      setSocketReady(false);
      addToast('Socket server unreachable', 'error');
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (blinkStopRef.current) {
        blinkStopRef.current();
        blinkStopRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, requestId, addToast, actor]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (!chatEnabled) {
      addToast('Chat is disabled for this consultation status.', 'error');
      return;
    }
    if (!socketRef.current || !socketReady) {
      addToast('Socket is disconnected. Retry in a moment.', 'error');
      return;
    }

    const text = input.trim();
    setInput('');

    socketRef.current.emit('consultation:typing', {
      consultationId: requestId,
      isTyping: false,
    });

    socketRef.current.emit('consultation:message', {
      consultationId: requestId,
      text,
      clientMessageId: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    });
  };

  const handleInputChange = (value) => {
    setInput(value);

    if (!socketRef.current || !socketReady || !chatEnabled) return;

    socketRef.current.emit('consultation:typing', {
      consultationId: requestId,
      isTyping: value.trim().length > 0,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current) return;
      socketRef.current.emit('consultation:typing', {
        consultationId: requestId,
        isTyping: false,
      });
    }, 1200);
  };

  const goBack = () => {
    if (actor === 'lawyer') {
      navigate('/lawyer/dashboard');
      return;
    }
    navigate('/connect-lawyer');
  };

  return (
    <div className="consult-chat-shell">
      <div className="consult-chat-card">
        <div className="consult-chat-header">
          <button className="outline-btn" onClick={goBack}><ArrowLeft size={16} /> Back</button>
          <div>
            <h1>
              {peerName
                ? (actor === 'lawyer'
                    ? `Chat with Client: ${peerName}`
                    : `Chat with Lawyer: ${peerName}`)
                : 'Consultation Chat'}
            </h1>
            <p>Request ID: {requestId}</p>
          </div>
          <span className={`chat-status ${socketReady ? 'online' : 'offline'}`}>
            {socketReady ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="consult-chat-messages">
          {loading && <p className="empty-text">Loading chat...</p>}
          {!loading && messages.length === 0 && <p className="empty-text">No messages yet. Start the conversation.</p>}
          {messages.map((msg, index) => {
            const mine = msg.senderType === actor;
            return (
              <div key={`${msg._id || msg.clientMessageId || index}`} className={`consult-msg ${mine ? 'mine' : 'theirs'}`}>
                <p>{msg.text}</p>
                <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString()}</span>
              </div>
            );
          })}
          {isPeerTyping && <p className="typing-line">Other participant is typing...</p>}
          <div ref={endRef} />
        </div>

        <div className="consult-chat-input-row">
          <input
            className="input-field"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            disabled={!chatEnabled}
          />
          <button className="gradient-btn" onClick={handleSend} disabled={!chatEnabled}>
            <Send size={16} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
