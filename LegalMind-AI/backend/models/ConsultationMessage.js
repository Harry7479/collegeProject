const mongoose = require('mongoose');

const consultationMessageSchema = new mongoose.Schema({
    consultationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConsultationRequest',
        required: true,
        index: true,
    },
    senderType: {
        type: String,
        enum: ['user', 'lawyer'],
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('ConsultationMessage', consultationMessageSchema);
