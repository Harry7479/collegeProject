const sendEmail = require('../utils/sendEmail');
const Lawyer = require('../models/Lawyer');
const crypto = require('crypto');

let storeResetOTP = {};
let verifiedEmails = {};

// Send OTP (called internally after registration)
const sendLawyerOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const lawyer = await Lawyer.findOne({ email });
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        lawyer.otp = otp;
        lawyer.otpExpire = Date.now() + 5 * 60 * 1000;
        await lawyer.save();

        await sendEmail(
            lawyer.email,
            'LegalMind AI — Verify Your Lawyer Account',
            `Your OTP is ${otp}. Please verify your email within 5 minutes. If you did not request this, please ignore this email.`
        );

        if (res && !res.headersSent) {
            return res.status(200).json({
                message: 'OTP sent successfully to your email',
                email: lawyer.email,
            });
        }
    } catch (error) {
        if (res && !res.headersSent) {
            return res.status(500).json({ message: 'Server Error: ' + error.message });
        }
        throw error;
    }
};

// Verify OTP
const verifyLawyerOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const lawyer = await Lawyer.findOne({ email });
        if (!lawyer) return res.status(404).json({ message: 'Lawyer not found' });

        if (lawyer.otp !== Number(otp) || lawyer.otpExpire < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        lawyer.isEmailVerified = true;
        lawyer.otp = undefined;
        lawyer.otpExpire = undefined;
        await lawyer.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send Password Reset OTP
const sendLawyerResetOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const lawyer = await Lawyer.findOne({ email });
        if (!lawyer) return res.status(404).json({ msg: 'Lawyer not found' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const sessionToken = crypto.randomBytes(16).toString('hex');

        storeResetOTP[sessionToken] = { email, otp, createdAt: Date.now() };

        await sendEmail(
            email,
            'LegalMind AI — Password Reset OTP',
            `Your password reset OTP is ${otp}. Valid for 5 minutes.`
        );

        return res.status(200).json({
            msg: 'OTP sent to your email for password reset',
            sessionToken,
        });
    } catch (error) {
        return res.status(500).json({ msg: 'Server Error: ' + error.message });
    }
};

// Verify Reset OTP
const verifyLawyerResetOTP = async (req, res) => {
    try {
        const { resetOtp, sessionToken } = req.body;
        if (!sessionToken) return res.status(400).json({ msg: 'No active reset session.' });

        const sessionData = storeResetOTP[sessionToken];
        if (!sessionData) return res.status(400).json({ msg: 'Invalid or expired session' });

        if (sessionData.otp != resetOtp) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        verifiedEmails[sessionToken] = sessionData.email;
        delete storeResetOTP[sessionToken];

        return res.status(200).json({ msg: 'OTP Verified Successfully', sessionToken });
    } catch (error) {
        res.status(500).json({ msg: 'Server Error: ' + error.message });
    }
};

// Reset Password
const resetLawyerPassword = async (req, res) => {
    try {
        const { newPassword, sessionToken } = req.body;
        if (!sessionToken) return res.status(403).json({ msg: 'No active reset session' });

        const email = verifiedEmails[sessionToken];
        if (!email) return res.status(403).json({ msg: 'OTP not verified or session expired' });

        const lawyer = await Lawyer.findOne({ email });
        if (!lawyer) return res.status(404).json({ msg: 'Lawyer not found' });

        lawyer.password = newPassword;
        await lawyer.save();

        delete verifiedEmails[sessionToken];
        return res.status(200).json({ msg: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Server Error: ' + error.message });
    }
};

module.exports = { sendLawyerOTP, verifyLawyerOTP, sendLawyerResetOTP, verifyLawyerResetOTP, resetLawyerPassword };
