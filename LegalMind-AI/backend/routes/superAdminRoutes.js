const express = require('express');
const router = express.Router();

const { superAdminProtect } = require('../middleware/superAdminMiddleware');
const {
    superAdminLogin,
    listPendingLawyers,
    listAllLawyersForReview,
    updateLawyerVerification,
} = require('../controllers/superAdminController');

router.post('/auth/login', superAdminLogin);
router.get('/lawyers/pending', superAdminProtect, listPendingLawyers);
router.get('/lawyers', superAdminProtect, listAllLawyersForReview);
router.patch('/lawyers/:lawyerId/verification', superAdminProtect, updateLawyerVerification);

module.exports = router;
