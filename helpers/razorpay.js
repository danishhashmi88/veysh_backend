import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

/** Get Razorpay instance. Returns null if keys not set. */
function getRazorpayInstance() {
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Create a Razorpay order for the given amount.
 * @param {number} amountPaise - Amount in paise (e.g. 50000 = ₹500)
 * @param {string} currency - e.g. "INR"
 * @param {string} receipt - Your unique receipt id (e.g. "sub_planId_userId_timestamp")
 * @returns {Promise<{ orderId: string, amount: number, currency: string }>}
 */
export async function createOrder(amountPaise, currency = "INR", receipt = "") {
  const instance = getRazorpayInstance();
  if (!instance) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  const amount = Math.round(Number(amountPaise));
  if (amount < 100) {
    throw new Error("Razorpay minimum amount is ₹1.");
  }
  const order = await instance.orders.create({
    amount,
    currency: currency.toUpperCase(),
    receipt: receipt || `rcpt_${Date.now()}`,
  });
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: keyId,
  };
}

/**
 * Verify Razorpay payment signature.
 * @param {string} orderId - Razorpay order_id
 * @param {string} paymentId - Razorpay payment_id (razorpay_payment_id from frontend)
 * @param {string} signature - Razorpay razorpay_signature from frontend
 * @returns {boolean}
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!keySecret) {
    throw new Error("Razorpay key secret is not configured.");
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  return expected === signature;
}

export { getRazorpayInstance, keyId as razorpayKeyId };
