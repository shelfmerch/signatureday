import dotenv from 'dotenv';

dotenv.config();

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_FLOW_ID = process.env.MSG91_OTP_TEMPLATE_ID;

const hasCreds = Boolean(MSG91_AUTH_KEY && MSG91_SENDER_ID && MSG91_FLOW_ID);
const hasFetch = typeof globalThis.fetch === 'function';

export const sendOTP = async ({ phone, otp, source = 'otp' }) => {
  if (!hasCreds || !hasFetch) {
    console.log(`[OTP][DEV][${source}] ${phone} -> ${otp}`);
    return { success: true, message: 'OTP logged (dev mode)' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const payload = {
      flow_id: MSG91_FLOW_ID,
      sender: MSG91_SENDER_ID,
      short_url: '1',
      recipients: [
        {
          mobiles: phone.replace('+', ''),
          otp,
          VAR1: otp,
          var1: otp,
          source,
          VAR2: source
        }
      ]
    };

    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MSG91 responded with ${response.status}: ${text}`);
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      message: data?.message || 'OTP sent successfully'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[OTP] MSG91 error', error);
    console.log(`[OTP][Fallback][${source}] ${phone} -> ${otp}`);
    return { success: true, message: 'OTP logged (fallback)' };
  }
};


