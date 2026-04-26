const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Ye link karega ki kis user ne konsi file dali
    },
    title: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String, // Cloudinary URL e.g. https://res.cloudinary.com/...
        required: true, 
    },
    cloudinaryPublicId: {
        type: String, // Cloudinary pe file ka unique public ID (delete ke liye zaroori)
    },
    status: {
        type: String,
        default: 'Uploaded' // Uploaded -> Ingested
    }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
