const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { lawyerProtect } = require('../middleware/lawyerAuthMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const {
    registerLawyer,
    loginLawyer,
    getLawyerVerificationStatus,
    getLawyerProfile,
    updateLawyerProfile,
    updateAvailability,
    listAvailableLawyers,
    createConsultationRequest,
    getUserConsultationRequests,
    getLawyerConsultationRequests,
    updateConsultationStatus,
    getLawyerDashboardStats,
    getUserConsultationMessages,
    getLawyerConsultationMessages,
    uploadVerificationDocuments,
} = require('../controllers/lawyerController');

const {
    sendLawyerOTP,
    verifyLawyerOTP,
    sendLawyerResetOTP,
    verifyLawyerResetOTP,
    resetLawyerPassword,
} = require('../controllers/lawyerOtpController');

router.post('/auth/register', registerLawyer);
router.post('/auth/login', loginLawyer);
router.get('/auth/status', getLawyerVerificationStatus);

// OTP routes
router.post('/auth/send-otp', sendLawyerOTP);
router.post('/auth/verify-otp', verifyLawyerOTP);
router.post('/auth/reset-otp', sendLawyerResetOTP);
router.post('/auth/validate-otp', verifyLawyerResetOTP);
router.post('/auth/reset-password', resetLawyerPassword);

router.get('/available', listAvailableLawyers);

router.post('/connect', protect, createConsultationRequest);
router.get('/my-requests', protect, getUserConsultationRequests);
router.get('/requests/:requestId/messages', protect, getUserConsultationMessages);

router.get('/admin/profile', lawyerProtect, getLawyerProfile);
router.put('/admin/profile', lawyerProtect, updateLawyerProfile);
router.patch('/admin/availability', lawyerProtect, updateAvailability);
router.get('/admin/requests', lawyerProtect, getLawyerConsultationRequests);
router.get('/admin/requests/:requestId/messages', lawyerProtect, getLawyerConsultationMessages);
router.patch('/admin/requests/:requestId/status', lawyerProtect, updateConsultationStatus);
router.get('/admin/dashboard/stats', lawyerProtect, getLawyerDashboardStats);
router.post('/admin/verification-docs', lawyerProtect, upload.array('verificationDocs', 5), uploadVerificationDocuments);

module.exports = router;
