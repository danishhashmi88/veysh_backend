import twilio from "twilio";


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Sends an SMS using Twilio.
 * @param {string} to - The recipient's phone number (E.164 format, e.g., +14155552671).
 * @param {string} message - The text message to send.
 * @returns {Promise<object>} - The response from Twilio or error object.
 */
export async function sendSMS(to, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: to,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendOtp(phoneNumber, otp) {
  const message = `Your OTP code is ${otp}. Do not share this with anyone.`;

  const response = await sendSMS(phoneNumber, message);

  if (response.success) {
    return { success: true, otp };
  } else {
    return { success: false, error: response.error };
  }
}