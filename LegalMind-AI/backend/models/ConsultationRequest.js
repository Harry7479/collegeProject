const mongoose = require('mongoose');

const consultationRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
        required: true,
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
    },
    issueSummary: {
        type: String,
        required: true,
        trim: true,
    },
    preferredMode: {
        type: String,
        enum: ['chat', 'call', 'whatsapp', 'in-person', 'video'],
        default: 'chat',
    },
    preferredTime: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
        default: 'pending',
    },
    lawyerResponseNote: {
        type: String,
        trim: true,
    },
    scheduledAt: {
        type: Date,
    },
    lastReadAtUser: {
        type: Date,
    },
    lastReadAtLawyer: {
        type: Date,
    },
}, { timestamps: true });

module.exports = mongoose.model('ConsultationRequest', consultationRequestSchema);
