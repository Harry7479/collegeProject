const SibApiV3Sdk = require('sib-api-v3-sdk');
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (email, subject, text) => {
    console.log('Sending email to:', email);

    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();

    const sendViaGmailFallback = async () => {
        const gmailUser = (process.env.EMAIL_USER || '').trim();
        const gmailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

        if (!gmailUser || !gmailPass) {
            throw new Error('Gmail fallback unavailable (missing EMAIL_USER/EMAIL_PASS).');
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        await transporter.sendMail({
            from: gmailUser,
            to: email,
            subject,
            text,
        });

        console.log('✅ Email sent via Gmail fallback');
    };

    try {
        if (!brevoKey) {
            throw new Error('Missing BREVO_API_KEY in .env');
        }

        if (!senderEmail) {
            throw new Error('Missing BREVO_SENDER_EMAIL (or EMAIL_USER) in .env');
        }

        if (brevoKey.startsWith('xkeysib-')) {
            const client = SibApiV3Sdk.ApiClient.instance;
            client.authentications['api-key'].apiKey = brevoKey;
            const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

            await apiInstance.sendTransacEmail({
                sender: { email: senderEmail },
                to: [{ email }],
                subject,
                textContent: text,
            });

            console.log('✅ Email sent successfully via Brevo API');
            return;
        }

        if (brevoKey.startsWith('xsmtpsib-')) {
            const smtpLogin = (process.env.BREVO_SMTP_LOGIN || '').trim();
            if (!smtpLogin) {
                throw new Error('Missing BREVO_SMTP_LOGIN for xsmtpsib key. Set BREVO_SMTP_LOGIN in .env.');
            }

            const transporter = nodemailer.createTransport({
                host: 'smtp-relay.brevo.com',
                port: 587,
                secure: false,
                auth: {
                    user: smtpLogin,
                    pass: brevoKey,
                },
            });

            await transporter.sendMail({
                from: senderEmail,
                to: email,
                subject,
                text,
            });

            console.log('✅ Email sent successfully via Brevo SMTP');
            return;
        }

        throw new Error('Invalid BREVO_API_KEY format. Use xkeysib-... (API) or xsmtpsib-... (SMTP).');
    } catch (error) {
        const brevoMessage = error.response?.body?.message || error.message;
        console.error('⚠️ Brevo send failed:', brevoMessage);

        try {
            await sendViaGmailFallback();
        } catch (fallbackError) {
            const fallbackMessage = fallbackError.response?.body?.message || fallbackError.message;
            console.error('❌ Email not sent:', fallbackMessage);
            throw new Error('Email not sent');
        }
    }
};

module.exports = sendEmail;
