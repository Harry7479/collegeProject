const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendOTP } = require('./otpController');

// @desc    Naya user register karna (Signup)
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Dekho if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'Bhai, ye email already registered hai!' });
        }

        // Naya user create karo
        const user = await User.create({
            name,
            email,
            password
        });
        if (!user) {
            return res.status(400).json({ message: "User creation failed" });
        }

        // OTP Bhejo
        await sendOTP(req, res);

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Existing user ko login karwana 
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        // Agar user mill gaya, AUR uska password match kar gaya
        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                return res.status(403).json({ message: "OTP not verified. Please verify your email first." });
            }

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id) // Login hone par entry token
            });
        } else {
            res.status(401).json({ message: 'Email or Password is wrong!' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { registerUser, loginUser };
