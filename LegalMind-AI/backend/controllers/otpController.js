const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const crypto = require('crypto');

let storeResetOTP = {};
let verifiedEmails = {};

const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        user.otp = otp;
        user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
        await user.save();

        await sendEmail(user.email, 'Your OTP Code', `Your OTP is ${otp} please verify within 5 minutes. If you did not request this, please ignore this email.`);
        
        // We do not send a response here if it's called from registerUser
        // But if it's an independent route, we can return response.
        // We'll let authController handle the response if it's from register.
        // So we just return the user object or void, or if res is passed, we send it.
        if (res && !res.headersSent) {
            return res.status(200).json({
                message: 'OTP sent successfully to your email',
                user: user.email
            });
        }
    } catch (error) {
        if (res && !res.headersSent) {
            return res.status(500).json({ msg: 'Server Error: ' + error.message });
        }
        throw error;
    }
}

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log('Verifying OTP for email:', email);

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.otp !== Number(otp) || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000);
        const sessionToken = crypto.randomBytes(16).toString('hex');
        
        storeResetOTP[sessionToken] = {
            email: email,
            otp: otp,
            createdAt: Date.now()
        };

        await sendEmail(email, 'Password Reset OTP', `Your password reset OTP is ${otp}. Valid for 5 minutes. If you did not request this, please ignore this email.`);

        // Sending sessionToken in response payload instead of cookie
        res.status(200).json({
           msg: 'OTP sent to your email for password reset',
           sessionToken: sessionToken
        });

    } catch (error) {
        return res.status(500).json({ msg: 'Server Error: ' + error.message });
    }
}

const resetVerifyOTP = async (req, res) => {
    try {
        const { resetOtp, sessionToken } = req.body;
        
        if (!sessionToken) {
            return res.status(400).json({ msg: "No active reset session. Please request a new OTP." });
        }
        
        const sessionData = storeResetOTP[sessionToken];
        
        if (!sessionData) {
            return res.status(400).json({ msg: "Invalid or expired session" });
        }
        
        const { email, otp } = sessionData;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (otp != resetOtp) {
            return res.status(400).json({ msg: "Invalid OTP" });
        }
        
        verifiedEmails[sessionToken] = email; // Store email by session token
        delete storeResetOTP[sessionToken];
        
        res.status(200).json({ 
            msg: "OTP Verified Successfully",
            sessionToken: sessionToken // Return again for the next step
        });

    } catch (error) {
        res.status(500).json({ msg: "Server Error: " + error.message });
    }
}

const resetPassword = async (req, res) => {
    try {
        const { newPassword, sessionToken } = req.body;
        
        if (!sessionToken) {
            return res.status(403).json({ msg: "No active reset session" });
        }

        const email = verifiedEmails[sessionToken];
        
        if (!email) {
            return res.status(403).json({ msg: "OTP not verified or session expired" });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        
        user.password = newPassword;
        await user.save();
        
        delete verifiedEmails[sessionToken];
        
        res.status(200).json({ msg: "Password reset successfully" });
   
    } catch (error) {
        res.status(500).json({ msg: "Server Error: " + error.message });
    }
};

module.exports = { sendOTP, verifyOTP, resetOTP, resetVerifyOTP, resetPassword };
