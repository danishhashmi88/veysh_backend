import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAccessToken = async () => {
  const serviceAccount = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../config",
        process.env.GOOGLE_SERVICE_ACCOUNT_FILE
      ),
      "utf8"
    )
  );
  

  const now = Math.floor(Date.now() / 1000);

  const jwtToken = jwt.sign(
    {
      iss: serviceAccount.client_email,
      scope:
        "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    serviceAccount.private_key,
    {
      algorithm: "RS256",
    }
  );

  const body = new URLSearchParams();

  body.append(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
  );

  body.append("assertion", jwtToken);

  const { data } = await axios.post(
    "https://oauth2.googleapis.com/token",
    body.toString(),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
};

export const verifyGoogleSubscription = async (
  purchaseToken
) => {
  try {
    const accessToken = await getAccessToken();

    const tokenInfo = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );
    
    console.log("TOKEN INFO =>", tokenInfo.data);
    
    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
      `${process.env.GOOGLE_PACKAGE_NAME}` +
      `/purchases/subscriptionsv2/tokens/${purchaseToken}`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(
      "GOOGLE SUBSCRIPTION =>",
      JSON.stringify(data, null, 2)
    );

    const lineItem = data.lineItems?.[0];

    if (!lineItem) {
      throw new Error(
        "Subscription line item not found."
      );
    }

    return {
      orderId: data.latestOrderId || null,

      productId: lineItem.productId || null,

      purchaseToken,

      startTime: data.startTime,

      expiryTime: lineItem.expiryTime,

      subscriptionState:
        data.subscriptionState,

      acknowledgementState:
        data.acknowledgementState,

      autoRenewEnabled:
        !!lineItem.autoRenewingPlan,

      lineItem,

      raw: data,
    };
  } catch (err) {
    console.error(
      "GOOGLE VERIFY ERROR =>",
      err.response?.data || err.message
    );

    throw new Error(
      err.response?.data?.error?.message ||
      "Google subscription verification failed"
    );
  }
};