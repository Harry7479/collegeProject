const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Environment variables (secret keys) ko load karne ke liye
dotenv.config();

// Database connect logic
const connectDB = require('./config/db');
connectDB();

const app = express();

const path = require('path');
const { initializeChatSocket } = require('./socket/chatSocket');

app.use(express.json());
app.use(cors()); 

// Serve uploads folder statically for PDF previews
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES IMPORTS ---
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const lawyerRoutes = require('./routes/lawyerRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

// --- ROUTES USE KAREIN ---
app.use('/api/auth', authRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/admin', superAdminRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Hello Bro! LegalMind API Gateway is running smoothly! 🚀');
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'https://legalmind-ai-br2h.onrender.com',
        methods: ['GET', 'POST','PUT','DELETE','PATCH','OPTIONS']
    }
});

app.set('io', io);

initializeChatSocket(io);

server.listen(PORT, () => {
    console.log(`Backend API Gateway is running on port: http://localhost:${PORT}`);
});

