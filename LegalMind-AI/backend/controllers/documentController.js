const Document = require("../models/Document");
const axios = require("axios");
const { uploadToCloudinary } = require("../middleware/uploadMiddleware");
const path = require("path");
const fs = require('fs');

const AI_ENGINE_URL = "http://127.0.0.1:8000";

// 1. Get All Documents
const getDocuments = async (req, res) => {
    try {
        const documents = await Document
            .find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch documents" });
    }
};


// 2. Upload Document
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded!" });
        }

        const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith('.pdf');
        const baseName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const uploadOptions = {
            folder: "legalmind-documents",
            public_id: isPdf ? `${baseName}_${Date.now()}.pdf` : `${baseName}_${Date.now()}`,
            resource_type: isPdf ? "raw" : "auto",
        };

        // Cloudinary upload directly from the saved physical disk file
        let cloudinaryPublicId = undefined;
        try {
            const result = await uploadToCloudinary(req.file.path, uploadOptions);
            cloudinaryPublicId = result.public_id;
        } catch (cloudError) {
            console.warn("Cloudinary upload bypassed (likely 10MB free tier limit). Defaulting to Local AI Server Storage.", cloudError.message);
        }

        // Point the UI safely to our static Node server uploads directory using dynamic host
        const localFileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        const newDoc = await Document.create({
            userId: req.user._id,
            title: req.file.originalname,
            fileUrl: localFileUrl, // Safe local preview URL overriding Cloudinary
            cloudinaryPublicId: cloudinaryPublicId
        });

        let aiEngineOutput = null;
        let aiErrorDetail = null;
        try {
            const FormData = require('form-data');
            const data = new FormData();

            // Read the saved physical file off disk memory as a stream to pass into AI
            data.append('file', fs.createReadStream(req.file.path));
            data.append('document_id', newDoc._id.toString());

            const pythonResponse = await axios.post(
                `${AI_ENGINE_URL}/ai/ingest-file`,
                data,
                {
                    headers: {
                        ...data.getHeaders()
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            newDoc.status = "Ingested";
            await newDoc.save();
            aiEngineOutput = pythonResponse.data;
        } catch (aiError) {
            aiErrorDetail = aiError.response?.data?.detail || aiError.message;
            console.error("AI ingestion failed:", aiErrorDetail);

            // Mark the document status as failed so we know it didn't ingest
            newDoc.status = "Failed";
            await newDoc.save();
        }

        if (aiErrorDetail) {
            return res.status(201).json({
                message: "File uploaded successfully, but AI analysis failed. Please ensure the Python AI Engine is running and the PDF contains readable text.",
                document: newDoc,
                warning: `AI ingestion failed: ${aiErrorDetail}`
            });
        }

        res.status(201).json({
            message: "File uploaded successfully",
            document: newDoc,
            aiEngineOutput
        });

    } catch (error) {
        res.status(500).json({
            message: "Upload failed",
            error: error.message
        });
    }
};


// 3. Query
const queryDocument = async (req, res) => {
    try {
        const { document_id, user_query } = req.body;

        const pythonResponse = await axios.post(
            `${AI_ENGINE_URL}/ai/query`,
            { document_id, user_query }
        );

        res.json(pythonResponse.data);

    } catch (error) {
        console.error("Query Error:", error.message);
        res.status(500).json({ error: "Query failed. Is the AI engine running?" });
    }
};


// 4. Risk
const analyzeRisk = async (req, res) => {
    try {
        const { document_id } = req.body;

        const pythonResponse = await axios.post(
            `${AI_ENGINE_URL}/ai/analyze-risk`,
            { document_id }
        );

        res.json(pythonResponse.data);

    } catch (error) {
        console.error("Risk Error:", error.message);
        res.status(500).json({ error: "Risk analysis failed. Is the AI engine running?" });
    }
};


// 5. Summary
const getSummary = async (req, res) => {
    try {
        const { document_id } = req.body;

        const pythonResponse = await axios.post(
            `${AI_ENGINE_URL}/ai/summary`,
            { document_id }
        );

        res.json(pythonResponse.data);

    } catch (error) {
        console.error("Summary Error:", error.message);
        res.status(500).json({ error: "Summary generation failed. Is the AI engine running?" });
    }
};


module.exports = {
    getDocuments,
    uploadDocument,
    queryDocument,
    analyzeRisk,
    getSummary
};