import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const credsPath = path.join(__dirname, "../config/firebaseCreds.json");

let firebaseReady = false;
try {
  const serviceAccount = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  if (serviceAccount && serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firebaseReady = true;
  console.log("[Firebase] config/firebaseCreds.json loaded via fs, FCM ready");
} catch (e) {
  console.warn("[Firebase] config/firebaseCreds.json failed to load. Error:", e?.message || e);
}

/**
* Send FCM push notification to a single device token.
* @param {string} token - FCM device token
* @param {object} payload - { title, body, data }
* @returns {Promise<string|null>} - message ID or null on skip/failure
*/
export async function sendFCMToToken(token, { title, body, data = {} }) {
  if (!firebaseReady) {
    console.log("[Firebase] FCM skip - not initialized (creds missing)");
    return null;
  }
  if (!token || typeof token !== "string" || !token.trim()) {
    console.log("[Firebase] FCM skip - no token provided");
    return null;
  }
  try {
    const messaging = admin.messaging();
    const message = {
      notification: { title: title || "Notification", body: body || "" },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [String(k), String(v)])
      ),
      token: token.trim(),
    };
    const messageId = await messaging.send(message);
    console.log("[Firebase] FCM sent ok, messageId:", messageId, "type:", data?.type || "-");
    return messageId;
  } catch (err) {
    console.warn("[Firebase] FCM send failed:", err?.message || err);
    if (err?.code || err?.errorInfo) {
      console.warn("[Firebase] Error Details:", JSON.stringify({ code: err.code, info: err.errorInfo }, null, 2));
    }
    return null;
  }
}