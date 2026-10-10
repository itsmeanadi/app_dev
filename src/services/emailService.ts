/**
 * src/services/emailService.ts
 *
 * Sends SOS emails via the EmailJS REST API.
 * No backend, no SMTP, no Firebase — just a POST request.
 *
 * HOW EMAILJS WORKS:
 * 1. You create a free account at https://www.emailjs.com
 * 2. You add an "Email Service" (e.g. Gmail) and get a service_id.
 * 3. You create an "Email Template" with placeholders like {{to_email}}.
 * 4. You get a public user_id (public key) from the dashboard.
 * 5. You POST to their REST API with these IDs + template_params.
 * 6. EmailJS sends the email from their servers — no backend needed!
 *
 * The three IDs are read from environment variables with the EXPO_PUBLIC_
 * prefix so Expo can inline them at build time.
 */

import { EMAILJS_API_URL, EMAIL_TIMEOUT_MS, EMAIL_MAX_RETRIES } from '../config';

// ─── EmailJS credentials from .env ──────────────────────────────────────────
const SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? '';
const TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '';
const USER_ID = process.env.EXPO_PUBLIC_EMAILJS_USER_ID ?? '';

/** Parameters sent to the EmailJS template */
interface SOSParams {
  to_email: string;
  user_name: string;
  time: string;
  maps_link: string;
  speed_kmh: string;
  peak_g: string;
  message: string;
}

/**
 * Check whether EmailJS credentials are configured.
 */
export function isEmailConfigured(): boolean {
  return SERVICE_ID.length > 0 && TEMPLATE_ID.length > 0 && USER_ID.length > 0;
}

/**
 * Send an SOS email via EmailJS REST API.
 *
 * @param params  Template parameters (see SOSParams).
 * @returns       A promise that resolves on success and rejects with an
 *                Error on failure (network, timeout, or API error).
 */
export async function sendSOSEmail(params: SOSParams): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'EmailJS is not configured. Fill in EXPO_PUBLIC_EMAILJS_SERVICE_ID, ' +
        'EXPO_PUBLIC_EMAILJS_TEMPLATE_ID, and EXPO_PUBLIC_EMAILJS_USER_ID in your .env file.',
    );
  }

  const templateParams = {
    ...params,
    to_email: params.to_email,
    email: params.to_email,
    to: params.to_email,
    recipient: params.to_email,
    recipient_email: params.to_email,
    user_email: params.to_email,
    reply_to: params.to_email,
    to_name: params.user_name || 'Emergency Contact',
    from_name: params.user_name || 'JerkGuard',
    name: params.user_name || 'JerkGuard User',
  };

  const body = JSON.stringify({
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: USER_ID,
    template_params: templateParams,
  });

  console.log(`[EmailJS] 📤 Dispatching SOS email to: "${params.to_email}" (Service: ${SERVICE_ID}, Template: ${TEMPLATE_ID})`);
  console.log('[EmailJS] 📦 Payload:', body);

  let lastError: Error | null = null;

  // Try once + EMAIL_MAX_RETRIES automatic retries
  for (let attempt = 0; attempt <= EMAIL_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

      const response = await fetch(EMAILJS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return; // success!
      }

      // Non-OK response — read the error text
      const errorText = await response.text().catch(() => 'Unknown error');
      lastError = new Error(`EmailJS responded with ${response.status}: ${errorText}`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = new Error(`Email request timed out after ${EMAIL_TIMEOUT_MS / 1000}s`);
      } else {
        lastError = new Error(`Network error: ${err.message}`);
      }
    }
  }

  // All attempts failed
  throw lastError ?? new Error('Failed to send email');
}

/**
 * Send a test email to verify the EmailJS configuration works.
 */
export async function sendTestEmail(toEmail: string, userName: string): Promise<void> {
  return sendSOSEmail({
    to_email: toEmail,
    user_name: userName,
    time: new Date().toLocaleString(),
    maps_link: 'https://maps.google.com/?q=0,0',
    speed_kmh: '0',
    peak_g: '0',
    message: '🧪 This is a TEST email from JerkGuard. If you received this, your setup is working!',
  });
}
