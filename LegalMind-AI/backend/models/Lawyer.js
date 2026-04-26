const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const slotSchema = new mongoose.Schema({
    day: {
        type: String,
        trim: true,
    },
    startTime: {
        type: String,
        trim: true,
    },
    endTime: {
        type: String,
        trim: true,
    },
}, { _id: false });

const lawyerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    whatsappNumber: {
        type: String,
        trim: true,
    },
    specialization: {
        type: [String],
        default: [],
    },
    experienceYears: {
        type: Number,
        default: 0,
        min: 0,
    },
    barCouncilId: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        trim: true,
    },
    languages: {
        type: [String],
        default: [],
    },
    bio: {
        type: String,
        trim: true,
    },
    consultationFee: {
        type: Number,
        default: 0,
        min: 0,
    },
    availabilityStatus: {
        type: String,
        enum: ['online', 'offline', 'busy'],
        default: 'offline',
    },
    availableSlots: {
        type: [slotSchema],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    verifiedAt: {
        type: Date,
    },
    verifiedBy: {
        type: String,
        trim: true,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    verificationDocuments: {
        type: [
            {
                docType: {
                    type: String,
                    enum: ['bar_council_certificate', 'id_proof', 'degree_certificate', 'other'],
                    default: 'other',
                },
                fileUrl: {
                    type: String,
                    trim: true,
                },
                cloudinaryPublicId: {
                    type: String,
                    trim: true,
                },
                originalName: {
                    type: String,
                    trim: true,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    otp: Number,
    otpExpire: Date,
    resetOtp: Number,
    resetOtpExpire: Date,
}, { timestamps: true });

lawyerSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

lawyerSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Lawyer', lawyerSchema);
