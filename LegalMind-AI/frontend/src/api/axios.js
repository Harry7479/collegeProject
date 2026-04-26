import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://legalmind-ai-backend.onrender.com') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('legalmind_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('legalmind_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  sendResetOTP: (email) => api.post('/auth/reset-otp', { email }),
  verifyResetOTP: (resetOtp, sessionToken) => api.post('/auth/validate-otp', { resetOtp, sessionToken }),
  resetPassword: (newPassword, sessionToken) => api.post('/auth/reset-password', { newPassword, sessionToken }),
};

// ===== DOCUMENTS =====
export const documentsAPI = {
  getAll: () => api.get('/document'), // (Ye abhi banai nahi Node me, isko rehnede)
  upload: (file, onProgress) => {
    const formData = new FormData();
    // dhyan dena yahan 'pdfFile' hi likhna hai kyuki node.js ka multer isi naam se wait kar raha hai
    formData.append('pdfFile', file);
    return api.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};

// ===== QUERY / CHAT =====
export const queryAPI = {
  ask: (documentId, question) => api.post('/document/query', { document_id: documentId, user_query: question }),
};

// ===== RISK ANALYSIS =====
export const riskAPI = {
  // Purna "/analyze" route galat tha jo 404 deta h
  // Ise "/document/analyze-risk" ya "/ai/analyze-risk" karo jo tumne APIGateway(Node.js) me likhi h!
  analyze: (documentId) => api.post('/document/analyze-risk', { document_id: documentId }),
  getReport: (reportId) => api.get(`/risk/report/${reportId}`),
};

// ===== SUMMARY =====
export const summaryAPI = {
  generate: (documentId) => api.post('/document/summary', { document_id: documentId }),
};

const lawyerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

lawyerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('legalmind_lawyer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('legalmind_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const lawyerAPI = {
  register: (payload) => api.post('/lawyers/auth/register', payload),
  login: (email, password) => api.post('/lawyers/auth/login', { email, password }),
  statusByEmail: (email) => api.get(`/lawyers/auth/status?email=${encodeURIComponent(email)}`),
  verifyOTP: (email, otp) => api.post('/lawyers/auth/verify-otp', { email, otp }),
  sendResetOTP: (email) => api.post('/lawyers/auth/reset-otp', { email }),
  verifyResetOTP: (resetOtp, sessionToken) => api.post('/lawyers/auth/validate-otp', { resetOtp, sessionToken }),
  resetPassword: (newPassword, sessionToken) => api.post('/lawyers/auth/reset-password', { newPassword, sessionToken }),
  listAvailable: (params = {}) => api.get('/lawyers/available', { params }),
  connect: (payload) => api.post('/lawyers/connect', payload),
  myRequests: () => api.get('/lawyers/my-requests'),
  getUserConsultationMessages: (requestId) => api.get(`/lawyers/requests/${requestId}/messages`),
  adminProfile: () => lawyerApi.get('/lawyers/admin/profile'),
  updateAdminProfile: (payload) => lawyerApi.put('/lawyers/admin/profile', payload),
  updateAvailability: (payload) => lawyerApi.patch('/lawyers/admin/availability', payload),
  adminRequests: () => lawyerApi.get('/lawyers/admin/requests'),
  getLawyerConsultationMessages: (requestId) => lawyerApi.get(`/lawyers/admin/requests/${requestId}/messages`),
  updateRequestStatus: (requestId, payload) => lawyerApi.patch(`/lawyers/admin/requests/${requestId}/status`, payload),
  adminStats: () => lawyerApi.get('/lawyers/admin/dashboard/stats'),
  uploadVerificationDocs: (formData, onProgress) =>
    lawyerApi.post('/lawyers/admin/verification-docs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
};

export const superAdminAPI = {
  login: (email, password) => adminApi.post('/admin/auth/login', { email, password }),
  getPendingLawyers: () => adminApi.get('/admin/lawyers/pending'),
  getAllLawyers: () => adminApi.get('/admin/lawyers'),
  verifyLawyer: (lawyerId, action, rejectionReason) => adminApi.patch(`/admin/lawyers/${lawyerId}/verification`, { action, rejectionReason }),
};

export default api;
