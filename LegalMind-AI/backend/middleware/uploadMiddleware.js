const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Multer Disk Storage: File ko local server me save karega preview ke liye
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${name}_${Date.now()}${ext}`);
    }
});

// 2. File Filter: Sirf allowed file types hi accept karo
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',                                                    // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only PDF, JPEG, PNG, WEBP, DOC, DOCX allowed.'), false);
    }
};

// 3. Multer instance banao
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

// 4. Cloudinary pe local file se upload karne ka helper function
const uploadToCloudinary = (localFilePath, options = {}) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(localFilePath, 
            {
                folder: options.folder || 'legalmind-documents',
                resource_type: options.resource_type || 'auto',
                public_id: options.public_id || undefined,
                ...options,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
    });
};

// 5. Cloudinary se file delete karne ka helper function
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
