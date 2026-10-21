import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.join(__dirname, "../config/AuthKey_86U83Z6KMK.p8");

const getToken = () => {
  const now = Math.floor(Date.now() / 1000);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Apple AuthKey missing at ${keyPath}`);
  }

  const privateKey = fs.readFileSync(keyPath, "utf8").trim();

  if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      `Apple AuthKey empty/invalid at ${keyPath} (size=${Buffer.byteLength(privateKey)}). Upload AuthKey_86U83Z6KMK.p8 into config/`
    );
  }

  const token = jwt.sign(
    {
      iss: process.env.APPLE_ISSUER_ID,
      iat: now,
      exp: now + 60 * 5,
      aud: "appstoreconnect-v1",
      bid: process.env.APPLE_BUNDLE_ID,
    },
    privateKey,
    {
      algorithm: "ES256",
      keyid: process.env.APPLE_KEY_ID,
    }
  );

  return token;
};

const decodeText = (text) => {
  return jwt.decode(text);
};

// export const verifyAppleTransaction = async (transactionId) => {
//   const token = getToken();

//   const headers = {
//     Authorization: `Bearer ${token}`,
//     "Content-Type": "application/json",
//   };

//   const isProd = process.env.PRODUCTION === "true";
//   const urls = isProd
//     ? [
//         `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
//         `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
//       ]
//     : [
//         `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
//       ];

//   const errors = [];

//   for (const url of urls) {
//     try {
//       console.log("Calling Apple =>", url);

//       const response = await axios.get(url, { headers });

//       const decoded = decodeText(response.data.signedTransactionInfo);

//       console.log(
//         "APPLE DECODED RESPONSE =>",
//         JSON.stringify(decoded, null, 2)
//       );

//       return decoded;
//     } catch (e) {
//       errors.push({
//         url,
//         status:       e.response?.status,
//         statusText:   e.response?.statusText,
//         responseData: e.response?.data,
//         message:      e.message
//       });
//     }
//   }

//   console.error("[verifyAppleTransaction] BOTH REQUESTS FAILED =>", JSON.stringify(errors, null, 2));
//   throw new Error("Apple transaction verification failed");
// };

export const verifyAppleTransaction = async (transactionId) => {
  console.log("\n================ VERIFY APPLE TRANSACTION ================");
 
  console.log("Transaction ID =>", transactionId);
 
  const token = getToken();
 
  console.log("JWT Token Generated");
  console.log("Token (first 80 chars) =>", token.substring(0, 80) + "...");
 
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
 
  const isProd = process.env.PRODUCTION === "true";
 
  console.log("Production Mode =>", isProd);
 
  const urls = isProd
    ? [
        `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
        `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
      ]
    : [
        `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
      ];
 
  console.log("URLs =>", urls);
 
  const errors = [];
 
  for (const url of urls) {
    try {
      console.log("\n------------------------------------------");
      console.log("Calling Apple URL =>", url);
      console.log("------------------------------------------");
 
      const response = await axios.get(url, {
        headers,
        timeout: 30000,
      });
 
      console.log("Apple Response Status =>", response.status);
      console.log(
        "Apple Raw Response =>",
        JSON.stringify(response.data, null, 2)
      );
 
      if (!response.data?.signedTransactionInfo) {
        console.log("signedTransactionInfo NOT FOUND");
        throw new Error("signedTransactionInfo missing");
      }
 
      const decoded = decodeText(response.data.signedTransactionInfo);
 
      console.log(
        "APPLE DECODED RESPONSE =>",
        JSON.stringify(decoded, null, 2)
      );
 
      console.log("================ VERIFY SUCCESS ================\n");
 
      return decoded;
 
    } catch (e) {
 
      console.log("\n************* APPLE REQUEST FAILED *************");
 
      console.log("URL =>", url);
 
      console.log("Status =>", e.response?.status);
 
      console.log("Status Text =>", e.response?.statusText);
 
      console.log(
        "Response Data =>",
        JSON.stringify(e.response?.data, null, 2)
      );
 
      console.log("Message =>", e.message);
 
      console.log("Stack =>", e.stack);
 
      console.log("***********************************************\n");
 
      errors.push({
        url,
        status: e.response?.status,
        statusText: e.response?.statusText,
        responseData: e.response?.data,
        message: e.message,
      });
    }
  }
 
  console.log("\n============= ALL REQUESTS FAILED =============");
 
  console.log(JSON.stringify(errors, null, 2));
 
  console.log("===============================================\n");
 
  throw new Error("Apple transaction verification failed");
};