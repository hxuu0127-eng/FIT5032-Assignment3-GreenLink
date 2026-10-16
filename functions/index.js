// D.2 + E.1: SendGrid attachment email via Firebase callable Cloud Function.
// Deployment requires Firebase Blaze. Keep SendGrid credentials in Firebase Secrets.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')

const apiKey = defineSecret('SENDGRID_API_KEY')
const fromEmail = defineSecret('SENDGRID_FROM_EMAIL')
const MAX_BYTES = 1024 * 1024
const types = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' }

exports.sendAttachmentEmail = onCall({
  region: 'australia-southeast1',
  secrets: [apiKey, fromEmail],
  enforceAppCheck: false,
  maxInstances: 3
}, async (request) => {
  if (!request.auth?.uid || !request.auth.token.email || !request.auth.token.email_verified) {
    throw new HttpsError('unauthenticated', 'Sign in with a verified email address before sending.')
  }
  const { subject, message, filename, mimeType, base64 } = request.data || {}
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 120 ||
      typeof message !== 'string' || !message.trim() || message.length > 2000 ||
      typeof filename !== 'string' || filename.length > 100 || !/^[\w .()-]+$/.test(filename) ||
      typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new HttpsError('invalid-argument', 'Invalid email or attachment fields.')
  }
  const extension = filename.split('.').pop().toLowerCase()
  if (types[extension] !== mimeType || base64.length > Math.ceil(MAX_BYTES * 4 / 3) + 4) {
    throw new HttpsError('invalid-argument', 'Unsupported or oversized attachment.')
  }
  const file = Buffer.from(base64, 'base64')
  if (!file.length || file.length > MAX_BYTES || file.toString('base64') !== base64) {
    throw new HttpsError('invalid-argument', 'Invalid attachment content.')
  }
  // Send only to the authenticated and verified user to avoid an open mail relay.
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey.value()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: request.auth.token.email }] }],
      from: { email: fromEmail.value() },
      subject: subject.trim(),
      content: [{ type: 'text/plain', value: message.trim() }],
      attachments: [{ content: base64, filename, type: mimeType, disposition: 'attachment' }]
    })
  }).catch(err => {
    logger.error('SendGrid network error', { message: err.message })
    throw new HttpsError('internal', 'Unable to connect to email provider.')
  })
  if (!response.ok) {
    logger.error('SendGrid rejected request', { status: response.status })
    throw new HttpsError('internal', 'Email provider rejected request; check logs and sender verification.')
  }
  return { success: true } // Accepted for processing, not proof of inbox delivery.
})
