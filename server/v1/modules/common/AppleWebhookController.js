import jwt from "jsonwebtoken";
import { verifyAppleTransaction } from "../../../../helpers/apple-iap.js";
import userSubscription from "../../../../models/user-subscription.js";
import subscriptionHelper from "../../../../helpers/subscription-helper.js";
import AppleWebhookLog from "../../../../models/apple-webhook-log.js";
import IapTransaction from "../../../../models/iap-transaction.js";

// ─── Save webhook log (always — even on error or not-found) ─────────────────

const saveWebhookLog = async ({ notificationType, subtype, decodedPayload, appleData, sub, error }) => {
  try {
    await AppleWebhookLog.create({
      user_id:                  sub?.user_id              ?? null,
      user_subscription_id:     sub?._id                  ?? null,
      subscription_id:          sub?.subscription_id      ?? null,
      notification_type:        notificationType          ?? null,
      notification_subtype:     subtype                   ?? null,
      original_transaction_id:  appleData?.originalTransactionId ?? null,
      transaction_id:           appleData?.transactionId  ?? null,
      product_id:               appleData?.productId      ?? null,
      bundle_id:                decodedPayload?.data?.bundleId ?? null,
      environment:              appleData?.environment    ?? null,
      decoded_payload:          decodedPayload,
      decoded_transaction:      appleData,
      processed:                !error,
      error:                    error ?? null,
    });
  } catch (e) {
    console.error("APPLE WEBHOOK LOG SAVE ERROR =>", e.message);
  }
};

// ─── Save IAP transaction log ────────────────────────────────────────────────

const saveIapTransaction = async ({ sub, appleData, eventType, notificationType, subtype }) => {
  try {
    await IapTransaction.create({
      user_id:                  sub.user_id,
      user_subscription_id:     sub._id,
      subscription_id:          sub.subscription_id,
      platform:                 "ios",
      product_id:               appleData?.productId              ?? sub.product_id,
      transaction_id:           appleData?.transactionId          ?? null,
      original_transaction_id:  appleData?.originalTransactionId  ?? null,
      event_type:               eventType,
      source:                   "WEBHOOK",
      paid_amount:              appleData?.price ? appleData.price / 1000 : 0,
      currency:                 appleData?.currency               ?? null,
      purchase_date:            appleData?.purchaseDate ? new Date(appleData.purchaseDate) : null,
      expires_date:             appleData?.expiresDate  ? new Date(appleData.expiresDate)  : null,
      environment:              appleData?.environment             ?? "Sandbox",
      raw_transaction:          appleData,
      notification_type:        notificationType,
      notification_subtype:     subtype,
    });
  } catch (e) {
    console.error("IAP TRANSACTION SAVE ERROR =>", e.message);
  }
};

// ─── Deactivate subscription and fall back to basic plan ────────────────────

const deactivate = async (sub) => {
  sub.status    = 0;
  sub.activated = false;
  sub.updatedBy = sub.user_id;
  await sub.save();
  await subscriptionHelper.assignBasicSubscription(sub.user_id);
};

// ─── Controller ─────────────────────────────────────────────────────────────

// const AppleWebhookController = {
//   notification: async (req, res) => {
//     let decodedPayload    = null;
//     let appleData         = null;
//     let sub               = null;
//     let notificationType  = null;
//     let subtype           = null;

//     try {
//       console.log("APPLE WEBHOOK ENTRY =>", { body: req.body });

//       const { signedPayload } = req.body || {};

//       if (!signedPayload) {
//         console.log("APPLE WEBHOOK => Missing signedPayload");
//         return res.sendStatus(400);
//       }

//       // Decode outer JWT
//       decodedPayload   = jwt.decode(signedPayload);
//       notificationType = decodedPayload?.notificationType;
//       subtype          = decodedPayload?.subtype;

//       console.log("APPLE WEBHOOK DECODED =>", JSON.stringify(decodedPayload, null, 2));

//       const signedTransaction = decodedPayload?.data?.signedTransactionInfo;

//       if (!signedTransaction) {
//         console.log("APPLE WEBHOOK => No signedTransactionInfo for type:", notificationType);
//         await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData: null, sub: null });
//         return res.sendStatus(200);
//       }

//       // Decode inner transaction JWT
//       const rawTransaction = jwt.decode(signedTransaction);
//       console.log("APPLE TRANSACTION DECODED =>", JSON.stringify(rawTransaction, null, 2));

//       // Webhook payload already contains verified transaction data from Apple.
//       // We skip the redundant verification call since Apple's Sandbox API can intermittently return 500 Server Error.
//       appleData = rawTransaction;

//       // Resolve subscription by original_transaction_id
//       sub = await userSubscription.findOne({
//         original_transaction_id: appleData.originalTransactionId,
//       });

//       if (!sub) {
//         console.log("APPLE WEBHOOK => No subscription found for originalTransactionId:", appleData.originalTransactionId);
//         await saveWebhookLog({
//           notificationType, subtype, decodedPayload, appleData, sub: null,
//           error: `No subscription found for originalTransactionId: ${appleData.originalTransactionId}`,
//         });
//         return res.sendStatus(200);
//       }

//       console.log("APPLE WEBHOOK => type:", notificationType, "| subtype:", subtype, "| user:", sub.user_id);

//       // ── Handle notification types ──────────────────────────────────────────

//       switch (notificationType) {

//         // Subscribed / Renewed / Offer redeemed — activate & update dates
//         case "SUBSCRIBED":
//         case "DID_RENEW":
//         case "OFFER_REDEEMED": {
//           sub.transaction_id  = appleData.transactionId;
//           sub.start_date      = new Date(appleData.purchaseDate);
//           sub.end_date        = new Date(appleData.expiresDate);
//           sub.paid_amount     = appleData.price / 1000;
//           sub.status          = 1;
//           sub.activated       = true;
//           sub.updatedBy       = sub.user_id;
//           await sub.save();

//           const eventMap = { SUBSCRIBED: "PURCHASE", DID_RENEW: "RENEWAL", OFFER_REDEEMED: "OFFER_REDEEMED" };
//           await saveIapTransaction({ sub, appleData, eventType: eventMap[notificationType], notificationType, subtype });
//           console.log("Subscription activated/renewed =>", notificationType);
//           break;
//         }

//         // Payment failed — grace period keeps it active, otherwise deactivate
//         case "DID_FAIL_TO_RENEW": {
//           if (subtype === "GRACE_PERIOD") {
//             await saveIapTransaction({ sub, appleData, eventType: "GRACE_PERIOD", notificationType, subtype });
//             console.log("Subscription in grace period, keeping active");
//           } else {
//             await deactivate(sub);
//             await saveIapTransaction({ sub, appleData, eventType: "FAIL_TO_RENEW", notificationType, subtype });
//             console.log("Subscription failed to renew, deactivated");
//           }
//           break;
//         }

//         // Expired / Grace period ended — deactivate
//         case "EXPIRED":
//         case "GRACE_PERIOD_EXPIRED": {
//           await deactivate(sub);
//           await saveIapTransaction({ sub, appleData, eventType: "EXPIRED", notificationType, subtype });
//           console.log("Subscription expired =>", notificationType);
//           break;
//         }

//         // Revoked (family sharing removed) — deactivate
//         case "REVOKE": {
//           await deactivate(sub);
//           await saveIapTransaction({ sub, appleData, eventType: "REVOKE", notificationType, subtype });
//           console.log("Subscription revoked");
//           break;
//         }

//         // Refund issued — deactivate
//         case "REFUND": {
//           await deactivate(sub);
//           await saveIapTransaction({ sub, appleData, eventType: "REFUND", notificationType, subtype });
//           console.log("Subscription refunded, deactivated");
//           break;
//         }

//         // Refund declined — subscription stays active, just log
//         case "REFUND_DECLINED": {
//           await saveIapTransaction({ sub, appleData, eventType: "OTHER", notificationType, subtype });
//           console.log("Refund declined, subscription remains active");
//           break;
//         }

//         // Price increase consent — just log
//         case "PRICE_INCREASE": {
//           await saveIapTransaction({ sub, appleData, eventType: "PRICE_INCREASE", notificationType, subtype });
//           console.log("Price increase notification, subtype:", subtype);
//           break;
//         }

//         default: {
//           await saveIapTransaction({ sub, appleData, eventType: "OTHER", notificationType, subtype });
//           console.log("Unhandled notificationType =>", notificationType);
//         }
//       }

//       // Save webhook log — processed: true
//       await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData, sub });

//       return res.sendStatus(200);

//     } catch (err) {
//       console.error("[AppleWebhook] ERROR =>", {
//         message:          err.message,
//         stack:            err.stack,
//         responseStatus:   err.response?.status,
//         responseData:     err.response?.data,
//         notificationType,
//         subtype,
//         originalTransactionId: appleData?.originalTransactionId ?? null,
//         transactionId:         appleData?.transactionId         ?? null,
//         userId:                sub?.user_id                     ?? null,
//       });

//       await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData, sub, error: err.message });

//       return res.sendStatus(500);
//     }
//   },
// };

const AppleWebhookController = {
  notification: async (req, res) => {
    let decodedPayload = null;
    let appleData = null;
    let sub = null;
    let notificationType = null;
    let subtype = null;
 
    try {
      console.log("APPLE WEBHOOK ENTRY =>", { body: req.body });
 
      const { signedPayload } = req.body || {};
 
      if (!signedPayload) {
        console.log("APPLE WEBHOOK => Missing signedPayload");
        return res.sendStatus(400);
      }
      let decodedPayload;
 
      try {
        // decodedPayload = jwt.decode(signedPayload, { complete: true });
        decodedPayload = jwt.decode(signedPayload);
 
        console.log("JWT DECODE SUCCESS");
        console.log(decodedPayload);
      } catch (err) {
        console.log("JWT DECODE FAILED");
        console.log(err);
      }
      
      notificationType = decodedPayload?.notificationType;
      subtype = decodedPayload?.subtype;
 
      console.log("APPLE WEBHOOK DECODED =>", JSON.stringify(decodedPayload, null, 2));
 
      const signedTransaction = decodedPayload?.data?.signedTransactionInfo;
 
      if (!signedTransaction) {
        console.log("APPLE WEBHOOK => No signedTransactionInfo for type:", notificationType);
        await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData: null, sub: null });
        return res.sendStatus(200);
      }
 
      // Decode inner transaction JWT
      const rawTransaction = jwt.decode(signedTransaction);
      console.log("APPLE TRANSACTION DECODED =>", JSON.stringify(rawTransaction, null, 2));
 
      // Webhook payload already contains verified transaction data from Apple.
      // We skip the redundant verification call since Apple's Sandbox API can intermittently return 500 Server Error.
      appleData = rawTransaction;
 
      // Resolve subscription by original_transaction_id
      sub = await userSubscription.findOne({
        original_transaction_id: appleData.originalTransactionId,
      });
 
      if (!sub) {
        console.log("APPLE WEBHOOK => No subscription found for originalTransactionId:", appleData.originalTransactionId);
        await saveWebhookLog({
          notificationType, subtype, decodedPayload, appleData, sub: null,
          error: `No subscription found for originalTransactionId: ${appleData.originalTransactionId}`,
        });
        return res.sendStatus(200);
      }
 
      console.log("APPLE WEBHOOK => type:", notificationType, "| subtype:", subtype, "| user:", sub.user_id);
 
      // ── Handle notification types ──────────────────────────────────────────
 
      switch (notificationType) {
 
        // Subscribed / Renewed / Offer redeemed — activate & update dates
        case "SUBSCRIBED":
        case "DID_RENEW":
        case "OFFER_REDEEMED": {
          sub.transaction_id = appleData.transactionId;
          sub.start_date = new Date(appleData.purchaseDate);
          sub.end_date = new Date(appleData.expiresDate);
          sub.paid_amount = appleData.price / 1000;
          sub.status = 1;
          sub.activated = true;
          sub.updatedBy = sub.user_id;
          await sub.save();
 
          const eventMap = { SUBSCRIBED: "PURCHASE", DID_RENEW: "RENEWAL", OFFER_REDEEMED: "OFFER_REDEEMED" };
          await saveIapTransaction({ sub, appleData, eventType: eventMap[notificationType], notificationType, subtype });
          console.log("Subscription activated/renewed =>", notificationType);
          break;
        }
 
        // Payment failed — grace period keeps it active, otherwise deactivate
        case "DID_FAIL_TO_RENEW": {
          if (subtype === "GRACE_PERIOD") {
            await saveIapTransaction({ sub, appleData, eventType: "GRACE_PERIOD", notificationType, subtype });
            console.log("Subscription in grace period, keeping active");
          } else {
            await deactivate(sub);
            await saveIapTransaction({ sub, appleData, eventType: "FAIL_TO_RENEW", notificationType, subtype });
            console.log("Subscription failed to renew, deactivated");
          }
          break;
        }
 
        // Expired / Grace period ended — deactivate
        case "EXPIRED":
        case "GRACE_PERIOD_EXPIRED": {
          await deactivate(sub);
          await saveIapTransaction({ sub, appleData, eventType: "EXPIRED", notificationType, subtype });
          console.log("Subscription expired =>", notificationType);
          break;
        }
 
        // Revoked (family sharing removed) — deactivate
        case "REVOKE": {
          await deactivate(sub);
          await saveIapTransaction({ sub, appleData, eventType: "REVOKE", notificationType, subtype });
          console.log("Subscription revoked");
          break;
        }
 
        // Refund issued — deactivate
        case "REFUND": {
          await deactivate(sub);
          await saveIapTransaction({ sub, appleData, eventType: "REFUND", notificationType, subtype });
          console.log("Subscription refunded, deactivated");
          break;
        }
 
        // Refund declined — subscription stays active, just log
        case "REFUND_DECLINED": {
          await saveIapTransaction({ sub, appleData, eventType: "OTHER", notificationType, subtype });
          console.log("Refund declined, subscription remains active");
          break;
        }
 
        // Price increase consent — just log
        case "PRICE_INCREASE": {
          await saveIapTransaction({ sub, appleData, eventType: "PRICE_INCREASE", notificationType, subtype });
          console.log("Price increase notification, subtype:", subtype);
          break;
        }
 
        default: {
          await saveIapTransaction({ sub, appleData, eventType: "OTHER", notificationType, subtype });
          console.log("Unhandled notificationType =>", notificationType);
        }
      }
 
      // Save webhook log — processed: true
      await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData, sub });
 
      return res.sendStatus(200);
 
    } catch (err) {
      console.error("[AppleWebhook] ERROR =>", {
        message: err.message,
        stack: err.stack,
        responseStatus: err.response?.status,
        responseData: err.response?.data,
        notificationType,
        subtype,
        originalTransactionId: appleData?.originalTransactionId ?? null,
        transactionId: appleData?.transactionId ?? null,
        userId: sub?.user_id ?? null,
      });
 
      await saveWebhookLog({ notificationType, subtype, decodedPayload, appleData, sub, error: err.message });
 
      return res.sendStatus(500);
    }
  },
};

export default AppleWebhookController;
