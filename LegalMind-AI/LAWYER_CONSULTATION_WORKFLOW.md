# LegalMind AI - Lawyer Consultation Workflow

## 1. Objective
This workflow defines how a user can connect with a real lawyer when AI response is not sufficient, and how lawyer onboarding is controlled through super-admin verification.

---

## 2. Roles

1. User
- Uses AI features and can raise consultation requests.

2. Lawyer
- Registers account, gets approved, logs in, manages profile and consultation requests.

3. Super Admin
- Reviews pending lawyer registrations and approves/rejects lawyers.

---

## 3. High-Level Flow

1. Lawyer registers.
2. Lawyer status is `pending` by default.
3. Super admin reviews pending lawyers.
4. Super admin approves or rejects.
5. Only approved lawyers can log in and appear in available lawyer list.
6. User creates consultation request to approved lawyer.
7. Lawyer accepts/rejects/completes request from dashboard.

---

## 4. Frontend Routes

## Public Routes
- `/`
- `/login`
- `/register`
- `/lawyer/login`
- `/admin/approval`

## User Protected Routes
- `/dashboard`
- `/upload`
- `/chat`
- `/risk`
- `/summary`
- `/settings`
- `/connect-lawyer`

## Lawyer Protected Routes
- `/lawyer/dashboard`

## Super Admin Protected Routes
- `/admin/approval/dashboard`

---

## 5. Backend API Workflow

Base URL: `http://localhost:5000/api`

## 5.1 Lawyer Public APIs

1. Register Lawyer
- `POST /lawyers/auth/register`
- Output: lawyer created with `verificationStatus: pending`.

2. Lawyer Login
- `POST /lawyers/auth/login`
- Allowed only if `verificationStatus = approved`.
- For pending/rejected, returns 403.

3. Lawyer Verification Status by Email
- `GET /lawyers/auth/status?email={email}`

4. List Available Lawyers (User-facing)
- `GET /lawyers/available`
- Returns only `approved` + `isActive=true` lawyers.

## 5.2 User Consultation APIs

1. Create Consultation Request
- `POST /lawyers/connect`
- Auth: User JWT (`legalmind_token`)

2. List My Consultation Requests
- `GET /lawyers/my-requests`
- Auth: User JWT

## 5.3 Lawyer Admin APIs

Auth Token: `legalmind_lawyer_token`

1. Get Profile
- `GET /lawyers/admin/profile`

2. Update Profile
- `PUT /lawyers/admin/profile`

3. Update Availability
- `PATCH /lawyers/admin/availability`

4. Get Consultation Requests
- `GET /lawyers/admin/requests`

5. Update Request Status
- `PATCH /lawyers/admin/requests/:requestId/status`
- Allowed: `accepted`, `rejected`, `in-progress`, `completed`

6. Dashboard Stats
- `GET /lawyers/admin/dashboard/stats`

## 5.4 Super Admin APIs

Auth Token: `legalmind_admin_token`

1. Super Admin Login
- `POST /admin/auth/login`
- Credentials from `.env`:
  - `SUPER_ADMIN_EMAIL`
  - `SUPER_ADMIN_PASSWORD`

2. List Pending Lawyers
- `GET /admin/lawyers/pending`

3. List All Lawyers
- `GET /admin/lawyers`

4. Approve/Reject Lawyer
- `PATCH /admin/lawyers/:lawyerId/verification`
- Body:
  - Approve: `{ "action": "approve" }`
  - Reject: `{ "action": "reject", "rejectionReason": "..." }`

---

## 6. Data Model Notes

## Lawyer Model Important Fields
- `verificationStatus`: `pending | approved | rejected`
- `verifiedAt`
- `verifiedBy`
- `rejectionReason`
- `availabilityStatus`: `online | offline | busy`

## Consultation Request Fields
- `userId`
- `lawyerId`
- `issueSummary`
- `preferredMode`
- `preferredTime`
- `status`
- `lawyerResponseNote`

---

## 7. UI Workflow (Step-by-Step)

## A. Lawyer Onboarding

1. Lawyer account created from register API.
2. Lawyer tries login:
- If pending/rejected: blocked with status message.
- If approved: dashboard access granted.

## B. Super Admin Approval

1. Open `/admin/approval`.
2. Login using super-admin credentials.
3. Review lawyers list.
4. Approve or reject each lawyer.

## C. User Consultation

1. User goes to `/connect-lawyer`.
2. Selects approved lawyer.
3. Adds issue summary + preferred mode/time.
4. Submits request.
5. Tracks request status in same page.

## D. Lawyer Operations

1. Lawyer logs in at `/lawyer/login`.
2. Opens `/lawyer/dashboard`.
3. Updates profile and availability.
4. Reviews incoming requests.
5. Updates request state.

---

## 8. Token Storage Convention

1. User token
- LocalStorage key: `legalmind_token`

2. Lawyer token
- LocalStorage key: `legalmind_lawyer_token`

3. Super admin token
- LocalStorage key: `legalmind_admin_token`

---

## 9. Testing Workflow (Recommended)

1. Use Postman collection:
- `backend/postman/LegalMind-Lawyer-Flow.postman_collection.json`

2. Suggested order:
- User login
- Lawyer register
- Admin login
- Admin approve lawyer
- Lawyer login
- User create consultation request
- Lawyer view and update request

---

## 10. Deployment and Security Notes

1. Do not keep default super-admin credentials in production.
2. Move secrets to secure env manager.
3. Add rate limiting for auth endpoints.
4. Add audit logs for approve/reject actions.
5. Add email/SMS notifications for:
- Lawyer approved/rejected
- Consultation request created
- Request status changed

---

## 11. Future Enhancements

1. Lawyer KYC/document verification upload.
2. Consultation scheduling with calendar slots.
3. In-app chat/call integration.
4. Payment + invoice flow.
5. SLA timers and escalation.

---

## 12. Quick Troubleshooting

1. `next is not a function`
- Cause: wrong Mongoose pre-save hook style.
- Fix: async pre-hook without forcing `next()` callback.

2. Lawyer cannot login
- Check `verificationStatus` is `approved`.

3. Lawyer not visible in available list
- Ensure `verificationStatus=approved` and `isActive=true`.

4. Admin APIs unauthorized
- Verify `legalmind_admin_token` set in request header.

---

## 13. Ownership

Feature Owner: LegalMind AI Team

Modules involved:
- Frontend (`frontend/src/pages`, `frontend/src/App.jsx`, `frontend/src/api/axios.js`)
- Backend (`backend/controllers`, `backend/routes`, `backend/models`, `backend/middleware`)
- QA (`backend/postman`)
