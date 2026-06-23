// Email service backed by Brevo's transactional REST API.
// Uses the built-in global fetch (Node 18+), so there is NO SDK dependency.
//
// Required env:
//   BREVO_API_KEY       — your Brevo API key (starts with "xkeysib-")
//   BREVO_SENDER_EMAIL  — a sender you've VERIFIED in Brevo (see note below)
// Optional env:
//   BREVO_SENDER_NAME   — display name for the sender (defaults below)
//   BUSINESS_EMAIL      — where low-rating testimonial alerts go
//
// NOTE: Unlike Resend's shared sandbox sender, Brevo requires the `sender`
// address to be a verified sender (or a verified domain) on your account.
// Add and confirm one at https://app.brevo.com/senders before sending.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Tutoring Team';

/**
 * Escape user-supplied values before interpolating them into HTML, so a
 * name like `O'Brien <script>` can never break or inject into the markup.
 */
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Low-level send via Brevo. Fault-tolerant: NEVER throws — always resolves to
 * a result object so callers can fire-and-forget safely.
 *
 * @returns {Promise<{ success: boolean, data?: object, error?: any }>}
 */
const sendViaBrevo = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY is not set — skipping email.');
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }
  if (!SENDER_EMAIL) {
    console.warn('⚠️  BREVO_SENDER_EMAIL is not set — skipping email.');
    return { success: false, error: 'BREVO_SENDER_EMAIL not configured' };
  }
  if (!to) {
    console.warn('⚠️  No recipient provided — skipping email.');
    return { success: false, error: 'Missing recipient email address' };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    // Brevo returns 201 with a messageId on success; non-2xx carries a reason.
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(
        `❌ Brevo send failed (${res.status}) to ${to}: ${detail}`
      );
      return { success: false, error: detail || `HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    console.log(
      `✅ Email sent to ${to} (messageId: ${data?.messageId ?? 'n/a'})`
    );
    return { success: true, data };
  } catch (err) {
    console.error(`❌ Unexpected error sending email to ${to}: ${err.message}`);
    return { success: false, error: err };
  }
};

/**
 * Build the styled HTML body for the onboarding confirmation email.
 * `tutoringOptions` may be an array, a single string, or empty.
 */
const buildConfirmationHtml = ({
  parentName,
  studentName,
  gradeLevel,
  tutoringOptions,
}) => {
  const safeParentName = escapeHtml(parentName) || 'there';
  const safeStudentName = escapeHtml(studentName) || 'your child';
  const safeGradeLevel = escapeHtml(gradeLevel) || 'Not specified';

  const optionsArray = Array.isArray(tutoringOptions)
    ? tutoringOptions
    : tutoringOptions
    ? [tutoringOptions]
    : [];

  const optionsList = optionsArray.length
    ? optionsArray
        .map((opt) => `<li style="margin:0 0 8px;">${escapeHtml(opt)}</li>`)
        .join('')
    : '<li style="margin:0 0 8px;">Our team will recommend the best options for your child.</li>';

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tutoring Request Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 40px 32px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome Aboard! &#127891;</h1>
                <p style="margin:8px 0 0;color:#e0e7ff;font-size:15px;">Your tutoring request has been received</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 8px;">
                <p style="margin:0 0 16px;color:#111827;font-size:16px;line-height:1.6;">Hi ${safeParentName},</p>
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                  Thank you for reaching out! We're thrilled to support <strong>${safeStudentName}</strong> on their learning journey. Here's a quick summary of what you shared with us:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #eef0f3;border-radius:10px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Student</p>
                      <p style="margin:0 0 18px;color:#111827;font-size:16px;font-weight:600;">${safeStudentName}</p>
                      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Grade Level</p>
                      <p style="margin:0;color:#111827;font-size:16px;font-weight:600;">${safeGradeLevel}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
                  Based on your request, here are the tutoring options we'll be tailoring for ${safeStudentName}:
                </p>
                <ul style="margin:0 0 24px;padding:0 0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                  ${optionsList}
                </ul>
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                  Our team is reviewing your request and will reach out shortly to confirm scheduling and next steps. If you have any questions in the meantime, simply reply to this email.
                </p>
                <p style="margin:0 0 4px;color:#111827;font-size:15px;line-height:1.6;">Warm regards,</p>
                <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">The Tutoring Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 36px;border-top:1px solid #eef0f3;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                  You're receiving this email because a tutoring request was submitted with this address.<br />
                  &copy; ${year} Tutoring Services. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

/**
 * Send the onboarding confirmation email to a parent.
 * Signature unchanged from the previous (Resend) implementation.
 */
export const sendParentConfirmationEmail = async ({
  parentName,
  parentEmail,
  studentName,
  gradeLevel,
  tutoringOptions,
}) => {
  return sendViaBrevo({
    to: parentEmail,
    subject: `Welcome aboard, ${parentName || 'there'}! 🎓`,
    html: buildConfirmationHtml({
      parentName,
      studentName,
      gradeLevel,
      tutoringOptions,
    }),
  });
};

/**
 * Build the internal HTML body for a low-rating testimonial alert (sent to the
 * business, not the customer).
 */
const buildTestimonialAlertHtml = ({ parentAuthor, rating, message }) => {
  const safeAuthor = escapeHtml(parentAuthor) || 'Anonymous';
  const safeMessage = escapeHtml(message) || '(no message provided)';
  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  const stars = '★'.repeat(clamped) + '☆'.repeat(5 - clamped);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Feedback Needs Attention</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#b91c1c;padding:28px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Feedback Needs Your Attention</h1>
                <p style="margin:6px 0 0;color:#fee2e2;font-size:14px;">A parent left a lower rating — consider reaching out.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;">
                <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">From</p>
                <p style="margin:0 0 18px;color:#111827;font-size:16px;font-weight:600;">${safeAuthor}</p>
                <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Rating</p>
                <p style="margin:0 0 18px;color:#b45309;font-size:20px;letter-spacing:2px;">${stars} <span style="color:#6b7280;font-size:14px;">(${clamped}/5)</span></p>
                <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #eef0f3;border-radius:10px;">
                  <tr>
                    <td style="padding:16px 18px;color:#374151;font-size:15px;line-height:1.7;">${safeMessage}</td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                  This feedback was stored and is awaiting moderation in your dashboard. It has not been published.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

/**
 * Alert the business when a low-rating testimonial comes in.
 * Signature unchanged from the previous (Resend) implementation.
 */
export const sendTestimonialAlertEmail = async ({
  parentAuthor,
  rating,
  message,
}) => {
  const businessEmail = process.env.BUSINESS_EMAIL;
  if (!businessEmail) {
    console.warn(
      '⚠️  BUSINESS_EMAIL is not set — cannot route low-rating feedback.'
    );
    return { success: false, error: 'BUSINESS_EMAIL not configured' };
  }

  return sendViaBrevo({
    to: businessEmail,
    subject: `⚠️ New ${rating}-star feedback needs attention`,
    html: buildTestimonialAlertHtml({ parentAuthor, rating, message }),
  });
};