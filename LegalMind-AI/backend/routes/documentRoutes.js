const express = require('express');
const router = express.Router();

// Controllers import
const {
    getDocuments,
    uploadDocument,
    queryDocument,
    analyzeRisk,
    getSummary
} = require("../controllers/documentController.js");


const { protect } = require('../middleware/authMiddleware'); // Bouncer guard
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/uploadMiddleware');

const uploadSinglePdf = (req, res, next) => {
    upload.single("pdfFile")(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Max size is 50MB.' });
        }

        return res.status(400).json({ message: err.message || 'Upload failed.' });
    });
};

//Routes mapping 
router.get("/", protect, getDocuments);

router.post(
    "/upload",
    protect,
    uploadSinglePdf,
    uploadDocument
);

router.post("/query", protect, queryDocument);

router.post("/analyze-risk", protect, analyzeRisk);

router.post("/summary", protect, getSummary);


module.exports = router;



