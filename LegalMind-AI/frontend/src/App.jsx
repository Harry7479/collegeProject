import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import ChatPage from './pages/Chat';
import RiskPage from './pages/Risk';
import SummaryPage from './pages/Summary';
import SettingsPage from './pages/Settings';
import ConnectLawyerPage from './pages/ConnectLawyer';
import ConsultationChatPage from './pages/ConsultationChat';
import LawyerLoginPage from './pages/LawyerLogin';
import LawyerRegisterPage from './pages/LawyerRegister';
import LawyerDashboardPage from './pages/LawyerDashboard';
import AdminApprovalPage from './pages/AdminApproval';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('legalmind_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedLawyerRoute({ children }) {
  const token = localStorage.getItem('legalmind_lawyer_token');
  if (!token) return <Navigate to="/lawyer/login" replace />;
  return children;
}

function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('legalmind_admin_token');
  if (!token) return <Navigate to="/admin/approval" replace />;
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/risk" element={<ProtectedRoute><RiskPage /></ProtectedRoute>} />
        <Route path="/summary" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/connect-lawyer" element={<ProtectedRoute><ConnectLawyerPage /></ProtectedRoute>} />
        <Route path="/consultation-chat/:requestId" element={<ProtectedRoute><ConsultationChatPage actor="user" /></ProtectedRoute>} />

        <Route path="/lawyer/login" element={<LawyerLoginPage />} />
        <Route path="/lawyer/register" element={<LawyerRegisterPage />} />
        <Route path="/lawyer/dashboard" element={<ProtectedLawyerRoute><LawyerDashboardPage /></ProtectedLawyerRoute>} />
        <Route path="/lawyer/consultation-chat/:requestId" element={<ProtectedLawyerRoute><ConsultationChatPage actor="lawyer" /></ProtectedLawyerRoute>} />

        <Route path="/admin/approval" element={<AdminApprovalPage />} />
        <Route path="/admin/approval/dashboard" element={<ProtectedAdminRoute><AdminApprovalPage /></ProtectedAdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
