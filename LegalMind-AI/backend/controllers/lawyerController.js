const Lawyer = require('../models/Lawyer');
const ConsultationRequest = require('../models/ConsultationRequest');
const ConsultationMessage = require('../models/ConsultationMessage');
const Document = require('../models/Document');
const generateLawyerToken = require('../utils/generateLawyerToken');
const mongoose = require('mongoose');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');
const fs = require('fs');
const { sendLawyerOTP } = require('./lawyerOtpController');

const sanitizeList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const MAX_ISSUE_SUMMARY_LENGTH = 1500;
const MAX_PREFERRED_TIME_LENGTH = 120;
const MAX_LAWYER_NOTE_LENGTH = 800;

const coerceTrimmedString = (value, maxLength) => {
    if (value === undefined || value === null) return '';
    const str = String(value).trim();
    if (!str) return '';
    return str.slice(0, maxLength);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const addUnreadCount = async (requests, actorType) => {
    const hydrated = await Promise.all(
        requests.map(async (request) => {
            const readAtField = actorType === 'lawyer' ? 'lastReadAtLawyer' : 'lastReadAtUser';
            const readAt = request[readAtField] || new Date(0);

            const unreadCount = await ConsultationMessage.countDocuments({
                consultationId: request._id,
                senderType: actorType === 'lawyer' ? 'user' : 'lawyer',
                createdAt: { $gt: readAt },
            });

            return {
                ...request.toObject(),
                unreadCount,
            };
        })
    );

    return hydrated;
};

const registerLawyer = async (req, res) => {
    try {
        const { name, email, password, phone, whatsappNumber, specialization, barCouncilId, city } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email and password are required' });
        }

        const lawyerExists = await Lawyer.findOne({ email });
        if (lawyerExists) {
            return res.status(400).json({ message: 'Lawyer already exists with this email' });
        }

        const lawyer = await Lawyer.create({
            name,
            email,
            password,
            phone,
            whatsappNumber,
            specialization: sanitizeList(specialization),
            barCouncilId,
            city,
        });

        // Send OTP for email verification
        await sendLawyerOTP({ body: { email } }, res);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const loginLawyer = async (req, res) => {
    try {
        const { email, password } = req.body;

        const lawyer = await Lawyer.findOne({ email });
        if (!lawyer || !(await lawyer.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check email verification
        if (!lawyer.isEmailVerified) {
            return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
        }

        if (lawyer.verificationStatus !== 'approved') {
            return res.status(403).json({
                message: 'Lawyer account is not approved yet',
                verificationStatus: lawyer.verificationStatus,
                rejectionReason: lawyer.rejectionReason || null,
            });
        }

        return res.json({
            _id: lawyer._id,
            name: lawyer.name,
            email: lawyer.email,
            token: generateLawyerToken(lawyer._id),
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getLawyerVerificationStatus = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'email query param is required' });
        }

        const lawyer = await Lawyer.findOne({ email }).select('name email verificationStatus rejectionReason verifiedAt isActive');
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        return res.json(lawyer);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getLawyerProfile = async (req, res) => {
    return res.json(req.lawyer);
};

const updateLawyerProfile = async (req, res) => {
    try {
        const lawyer = await Lawyer.findById(req.lawyer._id);
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        const fields = [
            'name',
            'phone',
            'whatsappNumber',
            'experienceYears',
            'barCouncilId',
            'city',
            'bio',
            'consultationFee',
            'availabilityStatus',
            'isActive',
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                lawyer[field] = req.body[field];
            }
        });

        if (req.body.specialization !== undefined) {
            lawyer.specialization = sanitizeList(req.body.specialization);
        }

        if (req.body.languages !== undefined) {
            lawyer.languages = sanitizeList(req.body.languages);
        }

        if (req.body.availableSlots !== undefined && Array.isArray(req.body.availableSlots)) {
            lawyer.availableSlots = req.body.availableSlots;
        }

        await lawyer.save();
        return res.json(lawyer);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateAvailability = async (req, res) => {
    try {
        const { availabilityStatus, availableSlots } = req.body;

        const lawyer = await Lawyer.findById(req.lawyer._id);
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        if (availabilityStatus) {
            lawyer.availabilityStatus = availabilityStatus;
        }

        if (Array.isArray(availableSlots)) {
            lawyer.availableSlots = availableSlots;
        }

        await lawyer.save();
        return res.json({ message: 'Availability updated', lawyer });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const listAvailableLawyers = async (req, res) => {
    try {
        const { specialization, city, language } = req.query;

        const query = { isActive: true, verificationStatus: 'approved' };
        if (city) {
            query.city = new RegExp(city, 'i');
        }
        if (specialization) {
            query.specialization = { $in: [new RegExp(specialization, 'i')] };
        }
        if (language) {
            query.languages = { $in: [new RegExp(language, 'i')] };
        }

        const lawyers = await Lawyer.find(query)
            .select('-password')
            .sort({ availabilityStatus: -1, experienceYears: -1, createdAt: -1 });

        return res.json(lawyers);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createConsultationRequest = async (req, res) => {
    try {
        const { lawyerId, documentId, issueSummary, preferredMode, preferredTime } = req.body;

        if (!lawyerId || !issueSummary) {
            return res.status(400).json({ message: 'lawyerId and issueSummary are required' });
        }

        if (!isValidObjectId(lawyerId)) {
            return res.status(400).json({ message: 'Invalid lawyerId' });
        }

        if (documentId && !isValidObjectId(documentId)) {
            return res.status(400).json({ message: 'Invalid documentId' });
        }

        const cleanIssueSummary = coerceTrimmedString(issueSummary, MAX_ISSUE_SUMMARY_LENGTH);
        if (!cleanIssueSummary) {
            return res.status(400).json({ message: 'issueSummary cannot be empty' });
        }

        const allowedModes = ['chat', 'call', 'whatsapp', 'in-person', 'video'];
        const cleanPreferredMode = preferredMode ? String(preferredMode).trim() : 'chat';
        if (!allowedModes.includes(cleanPreferredMode)) {
            return res.status(400).json({ message: 'preferredMode is invalid' });
        }

        const cleanPreferredTime = coerceTrimmedString(preferredTime, MAX_PREFERRED_TIME_LENGTH);

        const lawyer = await Lawyer.findOne({ _id: lawyerId, isActive: true });
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found or not active' });
        }

        if (documentId) {
            const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
            if (!doc) {
                return res.status(400).json({ message: 'Invalid document for this user' });
            }
        }

        const request = await ConsultationRequest.create({
            userId: req.user._id,
            lawyerId,
            documentId,
            issueSummary: cleanIssueSummary,
            preferredMode: cleanPreferredMode,
            preferredTime: cleanPreferredTime,
        });

        return res.status(201).json({ message: 'Consultation request created', request });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserConsultationRequests = async (req, res) => {
    try {
        const requests = await ConsultationRequest.find({ userId: req.user._id })
            .populate('lawyerId', 'name email phone whatsappNumber specialization city consultationFee availabilityStatus')
            .populate('documentId', 'title fileUrl')
            .sort({ createdAt: -1 });

        const requestsWithUnread = await addUnreadCount(requests, 'user');
        return res.json(requestsWithUnread);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getLawyerConsultationRequests = async (req, res) => {
    try {
        const requests = await ConsultationRequest.find({ lawyerId: req.lawyer._id })
            .populate('userId', 'name email')
            .populate('documentId', 'title fileUrl')
            .sort({ createdAt: -1 });

        const requestsWithUnread = await addUnreadCount(requests, 'lawyer');
        return res.json(requestsWithUnread);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateConsultationStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, lawyerResponseNote, scheduledAt } = req.body;

        const allowedStatuses = ['accepted', 'rejected', 'in-progress', 'completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status update' });
        }

        const request = await ConsultationRequest.findOne({
            _id: requestId,
            lawyerId: req.lawyer._id,
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        if (lawyerResponseNote !== undefined) {
            const cleanLawyerResponseNote = coerceTrimmedString(lawyerResponseNote, MAX_LAWYER_NOTE_LENGTH);
            request.lawyerResponseNote = cleanLawyerResponseNote;
        }
        if (scheduledAt !== undefined) {
            request.scheduledAt = scheduledAt;
        }

        await request.save();

        const io = req.app.get('io');
        if (io) {
            const payload = {
                consultationId: request._id.toString(),
                status: request.status,
                lawyerResponseNote: request.lawyerResponseNote || '',
                scheduledAt: request.scheduledAt || null,
                updatedAt: request.updatedAt,
            };

            io.to(`actor:user:${request.userId.toString()}`).emit('consultation:status-updated', payload);
            io.to(`actor:lawyer:${request.lawyerId.toString()}`).emit('consultation:status-updated', payload);
            io.to(`consultation:${request._id.toString()}`).emit('consultation:status-updated', payload);
        }

        return res.json({ message: 'Request updated', request });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getLawyerDashboardStats = async (req, res) => {
    try {
        const lawyerId = req.lawyer._id;

        const [
            totalRequests,
            pendingRequests,
            acceptedRequests,
            completedRequests,
        ] = await Promise.all([
            ConsultationRequest.countDocuments({ lawyerId }),
            ConsultationRequest.countDocuments({ lawyerId, status: 'pending' }),
            ConsultationRequest.countDocuments({ lawyerId, status: 'accepted' }),
            ConsultationRequest.countDocuments({ lawyerId, status: 'completed' }),
        ]);

        return res.json({
            totalRequests,
            pendingRequests,
            acceptedRequests,
            completedRequests,
            availabilityStatus: req.lawyer.availabilityStatus,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserConsultationMessages = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await ConsultationRequest.findOne({
            _id: requestId,
            userId: req.user._id,
        });

        if (!request) {
            return res.status(404).json({ message: 'Consultation request not found' });
        }

        const messages = await ConsultationMessage.find({ consultationId: requestId })
            .sort({ createdAt: 1 })
            .limit(300);

        request.lastReadAtUser = new Date();
        await request.save();

        return res.json({ messages });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getLawyerConsultationMessages = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await ConsultationRequest.findOne({
            _id: requestId,
            lawyerId: req.lawyer._id,
        });

        if (!request) {
            return res.status(404).json({ message: 'Consultation request not found' });
        }

        const messages = await ConsultationMessage.find({ consultationId: requestId })
            .sort({ createdAt: 1 })
            .limit(300);

        request.lastReadAtLawyer = new Date();
        await request.save();

        return res.json({ messages });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const uploadVerificationDocuments = async (req, res) => {
    try {
        // req.lawyer comes from lawyerProtect middleware
        const lawyer = await Lawyer.findById(req.lawyer._id);
        if (!lawyer) {
            return res.status(404).json({ message: 'Lawyer not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const ALLOWED_DOC_TYPES = ['bar_council_certificate', 'id_proof', 'degree_certificate', 'other'];

        // docTypes comes as JSON array string or comma-separated from frontend
        let docTypesRaw = req.body.docTypes;
        let docTypes = [];
        if (docTypesRaw) {
            try {
                docTypes = JSON.parse(docTypesRaw);
            } catch {
                docTypes = String(docTypesRaw).split(',').map((t) => t.trim());
            }
        }

        const uploadedDocs = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const docType = ALLOWED_DOC_TYPES.includes(docTypes[i]) ? docTypes[i] : 'other';

            try {
                const result = await uploadToCloudinary(file.path, {
                    folder: 'legalmind-lawyer-verification',
                    resource_type: 'auto',
                    public_id: `lawyer_${lawyer._id}_${docType}_${Date.now()}`,
                });

                uploadedDocs.push({
                    docType,
                    fileUrl: result.secure_url,
                    cloudinaryPublicId: result.public_id,
                    originalName: file.originalname,
                    uploadedAt: new Date(),
                });
            } finally {
                // Clean up local temp file
                try { fs.unlinkSync(file.path); } catch (_) { /* ignore */ }
            }
        }

        lawyer.verificationDocuments.push(...uploadedDocs);
        await lawyer.save();

        return res.status(201).json({
            message: `${uploadedDocs.length} document(s) uploaded successfully`,
            verificationDocuments: lawyer.verificationDocuments,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerLawyer,
    loginLawyer,
    getLawyerVerificationStatus,
    getLawyerProfile,
    updateLawyerProfile,
    updateAvailability,
    listAvailableLawyers,
    createConsultationRequest,
    getUserConsultationRequests,
    getLawyerConsultationRequests,
    updateConsultationStatus,
    getLawyerDashboardStats,
    getUserConsultationMessages,
    getLawyerConsultationMessages,
    uploadVerificationDocuments,
};
