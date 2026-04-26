const jwt = require('jsonwebtoken');
const Lawyer = require('../models/Lawyer');

const superAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@legalmind.ai';
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin12345';

        if (email !== adminEmail || password !== adminPassword) {
            return res.status(401).json({ message: 'Invalid super-admin credentials' });
        }

        const token = jwt.sign(
            { role: 'super-admin', email },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        return res.json({
            role: 'super-admin',
            email,
            token,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const listPendingLawyers = async (req, res) => {
    try {
        const lawyers = await Lawyer.find({ verificationStatus: 'pending' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.json(lawyers);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const listAllLawyersForReview = async (req, res) => {
    try {
        const lawyers = await Lawyer.find({})
            .select('-password')
            .sort({ createdAt: -1 });

        return res.json(lawyers);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateLawyerVerification = async (req, res) => {
    try {
        const { lawyerId } = req.params;
        const { action, rejectionReason } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
        }

        const lawyer = await Lawyer.findById(lawyerId);
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        if (action === 'approve') {
            lawyer.verificationStatus = 'approved';
            lawyer.rejectionReason = '';
            lawyer.verifiedAt = new Date();
            lawyer.verifiedBy = req.superAdmin.email;
        } else {
            lawyer.verificationStatus = 'rejected';
            lawyer.rejectionReason = rejectionReason || 'Rejected by super-admin';
            lawyer.verifiedAt = new Date();
            lawyer.verifiedBy = req.superAdmin.email;
        }

        await lawyer.save();

        return res.json({
            message: `Lawyer ${action}d successfully`,
            lawyer,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    superAdminLogin,
    listPendingLawyers,
    listAllLawyersForReview,
    updateLawyerVerification,
};
