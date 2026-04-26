const jwt = require('jsonwebtoken');
const axios = require('axios');
const Document = require('../models/Document');
const ConsultationRequest = require('../models/ConsultationRequest');
const ConsultationMessage = require('../models/ConsultationMessage');

const getTokenFromHandshake = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake?.headers?.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  return null;
};

const verifySocketUser = (socket) => {
  const token = getTokenFromHandshake(socket);
  if (!token) {
    throw new Error('Missing auth token');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded?.id) {
    return { actorId: decoded.id, role: 'user' };
  }

  if (decoded?.lawyerId) {
    return { actorId: decoded.lawyerId, role: 'lawyer' };
  }

  if (!decoded?.id && !decoded?.lawyerId) {
    throw new Error('Invalid token payload');
  }
};

const initializeChatSocket = (io) => {
  io.on('connection', (socket) => {
    let actor;

    try {
      actor = verifySocketUser(socket);
      socket.join(`actor:${actor.role}:${actor.actorId}`);
    } catch (error) {
      socket.emit('chat:error', { message: 'Socket authentication failed' });
      socket.disconnect(true);
      return;
    }

    socket.on('chat:join', async ({ documentId }) => {
      try {
        if (!documentId) {
          socket.emit('chat:error', { message: 'documentId is required to join chat room' });
          return;
        }

        const doc = await Document.findOne({ _id: documentId, userId: actor.actorId });
        if (!doc) {
          socket.emit('chat:error', { message: 'Document not found for this user' });
          return;
        }

        const room = `doc:${documentId}`;
        socket.join(room);
        socket.emit('chat:joined', { documentId });
      } catch (error) {
        socket.emit('chat:error', { message: 'Unable to join chat room' });
      }
    });

    socket.on('chat:message', async ({ documentId, question, clientMessageId }) => {
      try {
        if (!documentId || !question) {
          socket.emit('chat:error', { message: 'documentId and question are required', clientMessageId });
          return;
        }

        const doc = await Document.findOne({ _id: documentId, userId: actor.actorId });
        if (!doc) {
          socket.emit('chat:error', { message: 'Document not found for this user', clientMessageId });
          return;
        }

        const pythonResponse = await axios.post('http://127.0.0.1:8000/ai/query', {
          document_id: documentId,
          user_query: question,
        });

        socket.emit('chat:response', {
          clientMessageId,
          documentId,
          answer: pythonResponse.data?.answer || 'No answer generated',
          sources: pythonResponse.data?.sources || [],
          confidence: pythonResponse.data?.confidence || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || 'Query failed';
        socket.emit('chat:error', {
          clientMessageId,
          message: errorMessage,
        });
      }
    });

    socket.on('consultation:join', async ({ consultationId }) => {
      try {
        if (!consultationId) {
          socket.emit('consultation:error', { message: 'consultationId is required' });
          return;
        }

        const query = actor.role === 'lawyer'
          ? { _id: consultationId, lawyerId: actor.actorId }
          : { _id: consultationId, userId: actor.actorId };

        const consultation = await ConsultationRequest.findOne(query);
        if (!consultation) {
          socket.emit('consultation:error', { message: 'Consultation not found for this account' });
          return;
        }

        const room = `consultation:${consultationId}`;
        socket.join(room);
        socket.emit('consultation:joined', { consultationId });
      } catch (error) {
        socket.emit('consultation:error', { message: 'Unable to join consultation room' });
      }
    });

    socket.on('consultation:message', async ({ consultationId, text, clientMessageId }) => {
      try {
        if (!consultationId || !text?.trim()) {
          socket.emit('consultation:error', { message: 'consultationId and text are required', clientMessageId });
          return;
        }

        const query = actor.role === 'lawyer'
          ? { _id: consultationId, lawyerId: actor.actorId }
          : { _id: consultationId, userId: actor.actorId };

        const consultation = await ConsultationRequest.findOne(query);
        if (!consultation) {
          socket.emit('consultation:error', { message: 'Consultation not found for this account', clientMessageId });
          return;
        }

        if (['rejected', 'cancelled'].includes(consultation.status)) {
          socket.emit('consultation:error', { message: 'Chat is disabled for this consultation status', clientMessageId });
          return;
        }

        const messageDoc = await ConsultationMessage.create({
          consultationId,
          senderType: actor.role,
          senderId: actor.actorId,
          text: text.trim(),
        });

        io.to(`consultation:${consultationId}`).emit('consultation:message', {
          _id: messageDoc._id,
          consultationId,
          senderType: messageDoc.senderType,
          text: messageDoc.text,
          createdAt: messageDoc.createdAt,
          clientMessageId,
        });
      } catch (error) {
        socket.emit('consultation:error', {
          clientMessageId,
          message: error.message || 'Unable to send message',
        });
      }
    });

    socket.on('consultation:typing', async ({ consultationId, isTyping }) => {
      try {
        if (!consultationId) return;

        const query = actor.role === 'lawyer'
          ? { _id: consultationId, lawyerId: actor.actorId }
          : { _id: consultationId, userId: actor.actorId };

        const consultation = await ConsultationRequest.findOne(query).select('_id');
        if (!consultation) return;

        socket.to(`consultation:${consultationId}`).emit('consultation:typing', {
          consultationId,
          senderType: actor.role,
          isTyping: Boolean(isTyping),
        });
      } catch (error) {
        // Ignore typing indicator failures to avoid noisy UX.
      }
    });
  });
};

module.exports = { initializeChatSocket };
