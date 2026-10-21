import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE, ACTIVE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
import subscription from "../../../../../models/subscription.js";
import userSubscription from "../../../../../models/user-subscription.js";
import IapTransaction from "../../../../../models/iap-transaction.js";
import subscriptionHelper from "../../../../../helpers/subscription-helper.js";
import { verifyAppleTransaction } from "../../../../../helpers/apple-iap.js";
import { verifyGoogleSubscription } from "../../../../../helpers/google-iap.js";

// ─── Save IAP transaction log ────────────────────────────────────────────────

const saveIapTransaction = async ({ userId, sub, appleData, googleData, plan, eventType, source = "APP" }) => {
  try {
    await IapTransaction.create({
      user_id:                  userId,
      user_subscription_id:     sub?._id                          ?? null,
      subscription_id:          sub?.subscription_id ?? plan?._id ?? null,
      platform:                 sub?.platform ?? (appleData ? "ios" : "android"),
      product_id:               appleData?.productId ?? googleData?.productId ?? sub?.product_id ?? plan?.product_id ?? null,
      transaction_id:           appleData?.transactionId          ?? null,
      original_transaction_id:  appleData?.originalTransactionId  ?? null,
      purchase_token:           googleData ? (sub?.purchase_token ?? null) : null,
      order_id:                 googleData?.orderId               ?? null,
      event_type:               eventType,
      source,
      paid_amount:              appleData?.price  ? appleData.price / 1000
                              : googleData        ? (plan?.price ?? 0)
                              : 0,
      currency:                 appleData?.currency ?? null,
      purchase_date:            appleData?.purchaseDate  ? new Date(appleData.purchaseDate)
                              : googleData?.startTime    ? new Date(googleData.startTime)
                              : new Date(),
      expires_date:             appleData?.expiresDate   ? new Date(appleData.expiresDate)
                              : googleData?.expiryTime   ? new Date(googleData.expiryTime)
                              : null,
      environment:              appleData?.environment ?? "Sandbox",
      raw_transaction:          appleData ?? googleData ?? null,
    });
  } catch (e) {
    console.error("IAP TRANSACTION SAVE ERROR =>", e.message);
  }
};

// ─── Controller ─────────────────────────────────────────────────────────────

const PurchaseController = {

  getActiveSubscription: async (req, res) => {
    try {
      const userId = req.user._id;

      const activeUserSub = await userSubscription
        .findOne({ user_id: userId, activated: true })
        .sort({ createdAt: -1 })
        .populate("subscription_id", "title price duration_type description benefits subscription_access");

      if (!activeUserSub) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, { subscription: null });
      }

      // Expired check
      if (activeUserSub.end_date && new Date(activeUserSub.end_date) <= new Date()) {
        activeUserSub.activated = false;
        activeUserSub.status    = 0;
        await activeUserSub.save();
        await subscriptionHelper.assignBasicSubscription(userId);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, { subscription: null });
      }

      const plan = activeUserSub.subscription_id;
      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        subscription: {
          _id:                  activeUserSub._id,
          subscription_id:      plan?._id,
          title:                activeUserSub.title,
          price:                activeUserSub.price,
          duration_type:        activeUserSub.duration_type,
          description:          activeUserSub.description          ?? plan?.description,
          start_date:           activeUserSub.start_date,
          end_date:             activeUserSub.end_date,
          benefits:             activeUserSub.benefits             ?? plan?.benefits             ?? [],
          subscription_access:  activeUserSub.subscription_access  ?? plan?.subscription_access  ?? [],
          platform:             activeUserSub.platform,
          status:               activeUserSub.status,
          plan: plan ? {
            _id:                plan._id,
            title:              plan.title,
            price:              plan.price,
            duration_type:      plan.duration_type,
            description:        plan.description,
            benefits:           plan.benefits,
            subscription_access: plan.subscription_access,
          } : null,
        },
      });
    } catch (err) {
      return global.failResponse(res, err?.message || "Failed to get active subscription", err);
    }
  },

  subscriptionList: async (req, res) => {
    try {
      const plans = await subscription.find({ status: 1 }).lean();
      return global.successResponse(res, MESSAGE.OPR_SUCCESS, { list: plans });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  saveSubscription: async (req, res) => {
    try {
      const { product_id, platform, transaction_id, receipt, purchase_token } = req.body;
      const userId = req.user._id;

      if (!product_id)  return global.failResponse(res, "Product ID is required", {});
      if (!platform)    return global.failResponse(res, "Platform is required", {});
      if (!["ios", "android"].includes(platform)) return global.failResponse(res, "Invalid platform", {});
      if (platform === "ios"     && !transaction_id)  return global.failResponse(res, "Transaction ID is required", {});
      if (platform === "android" && !purchase_token)  return global.failResponse(res, "Purchase token is required", {});

      const plan = await subscription.findOne({ product_id, status: 1 });
      if (!plan) return global.failResponse(res, "Subscription plan not found", {});

      let appleData  = null;
      let googleData = null;
      let startDate, endDate;

      // ── iOS ───────────────────────────────────────────────────────────────
      if (platform === "ios") {
        appleData = await verifyAppleTransaction(transaction_id);

        if (!appleData)                         return global.failResponse(res, "Apple transaction verification failed", {});
        if (appleData.productId !== product_id) return global.failResponse(res, "Invalid Apple product", {});

        startDate = new Date(appleData.purchaseDate);
        endDate   = new Date(appleData.expiresDate);

        // Renewal — existing subscription with same original_transaction_id
        const existing = await userSubscription.findOne({
          user_id: userId,
          original_transaction_id: appleData.originalTransactionId,
        });

        if (existing) {
          existing.transaction_id = appleData.transactionId;
          existing.receipt        = receipt || existing.receipt;
          existing.start_date     = startDate;
          existing.end_date       = endDate;
          existing.paid_amount    = appleData.price / 1000;
          existing.status         = 1;
          existing.activated      = true;
          existing.updatedBy      = userId;
          await existing.save();

          await saveIapTransaction({ userId, sub: existing, appleData, plan, eventType: "RENEWAL" });

          return global.successResponse(res, "Subscription renewed", { subscription: existing });
        }
      }

      // ── Android ───────────────────────────────────────────────────────────
      else {
        googleData = await verifyGoogleSubscription(purchase_token);

        if (!googleData)                          return global.failResponse(res, "Google verification failed", {});
        if (googleData.productId !== product_id)  return global.failResponse(res, "Invalid Google product", {});
        if (googleData.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE") return global.failResponse(res, "Subscription is not active", {});

        startDate = new Date(googleData.startTime);
        endDate   = new Date(googleData.expiryTime);

        // Renewal — existing subscription with same purchase_token
        const existing = await userSubscription.findOne({ purchase_token });

        if (existing) {
          existing.start_date             = startDate;
          existing.end_date               = endDate;
          existing.order_id               = googleData.orderId;
          existing.subscription_state     = googleData.subscriptionState;
          existing.acknowledgement_state  = googleData.acknowledgementState;
          existing.verified               = true;
          existing.verified_at            = new Date();
          existing.status                 = 1;
          existing.activated              = true;
          existing.updatedBy              = userId;
          await existing.save();

          await saveIapTransaction({ userId, sub: existing, googleData, plan, eventType: "RENEWAL" });

          return global.successResponse(res, "Subscription renewed", { subscription: existing });
        }
      }

      // ── First purchase — deactivate any existing active subs ──────────────
      await userSubscription.updateMany(
        { user_id: userId, activated: true },
        { $set: { activated: false, status: 0 } }
      );

      const newSub = await userSubscription.create({
        title:                plan.title,
        price:                plan.price,
        subscription_id:      plan._id,
        user_id:              userId,
        product_id,
        platform,
        transaction_id:       platform === "ios"     ? appleData.transactionId        : purchase_token,
        original_transaction_id: platform === "ios"  ? appleData.originalTransactionId : null,
        purchase_token:       platform === "android" ? purchase_token                 : null,
        receipt:              platform === "ios"     ? receipt                        : null,
        order_id:             platform === "android" ? googleData.orderId             : null,
        subscription_state:   platform === "android" ? googleData.subscriptionState   : null,
        acknowledgement_state: platform === "android" ? googleData.acknowledgementState : null,
        verified:             platform === "android",
        verified_at:          platform === "android" ? new Date()                     : null,
        duration_type:        plan.duration_type,
        start_date:           startDate,
        end_date:             endDate,
        paid_amount:          platform === "ios" ? appleData.price / 1000 : plan.price,
        subscription_access:  plan.subscription_access || [],
        benefits:             plan.benefits            || [],
        description:          plan.description         || null,
        status:               1,
        activated:            true,
        createdBy:            userId,
        updatedBy:            userId,
      });

      await saveIapTransaction({ userId, sub: newSub, appleData, googleData, plan, eventType: "PURCHASE" });

      return global.successResponse(
        res,
        platform === "ios" ? "Subscription purchased" : "Subscription activated",
        { subscription: newSub }
      );

    } catch (err) {
      console.error("[saveSubscription] ERROR =>", {
        message:        err.message,
        stack:          err.stack,
        responseStatus: err.response?.status,
        responseData:   err.response?.data,
        requestBody:    req.body,
        userId:         req.user?._id,
      });
      return global.failResponse(res, err.message || "Subscription purchase failed", err.response?.data || err);
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      const userId = req.user._id;
      const { subscription_id } = req.body;

      const sub = await userSubscription.findOne({ _id: subscription_id, user_id: userId });
      if (!sub)          return global.failResponse(res, "Subscription not found", {});
      if (!sub.activated) return global.failResponse(res, "Subscription is already cancelled", {});

      sub.status    = 0;
      sub.activated = false;
      sub.updatedBy = userId;
      await sub.save();

      await subscriptionHelper.assignBasicSubscription(userId);

      await saveIapTransaction({ userId, sub, appleData: null, googleData: null, plan: null, eventType: "CANCEL" });

      return global.successResponse(res, "Subscription cancelled", {});
    } catch (err) {
      console.error("[cancelSubscription] ERROR =>", {
        message: err.message,
        stack:   err.stack,
        userId:  req.user?._id,
        body:    req.body,
      });
      return global.failResponse(res, err.message, err);
    }
  },

  restoreSubscription: async (req, res) => {
    try {
      const { transaction_id } = req.body;
      const userId = req.user._id;

      if (!transaction_id) return global.failResponse(res, "Transaction ID is required", {});

      const appleData = await verifyAppleTransaction(transaction_id);
      if (!appleData) return global.failResponse(res, "Apple transaction verification failed", {});

      const isValid = appleData.expiresDate && new Date(appleData.expiresDate) > new Date();
      if (!isValid) return global.failResponse(res, "Subscription has expired and cannot be restored", {});

      const existing = await userSubscription.findOne({
        original_transaction_id: appleData.originalTransactionId,
      });

      if (existing) {
        await userSubscription.updateMany(
          { user_id: userId, activated: true },
          { $set: { activated: false, status: 0 } }
        );

        existing.transaction_id = appleData.transactionId;
        existing.start_date     = new Date(appleData.purchaseDate);
        existing.end_date       = new Date(appleData.expiresDate);
        existing.paid_amount    = appleData.price / 1000;
        existing.status         = 1;
        existing.activated      = true;
        existing.updatedBy      = userId;
        await existing.save();

        await saveIapTransaction({ userId, sub: existing, appleData, plan: null, eventType: "RESTORE" });

        return global.successResponse(res, "Subscription restored", { subscription: existing });
      }

      // Not found locally — treat as fresh purchase
      req.body.platform = "ios";
      return PurchaseController.saveSubscription(req, res);

    } catch (err) {
      console.error("[restoreSubscription] ERROR =>", {
        message:        err.message,
        stack:          err.stack,
        responseStatus: err.response?.status,
        responseData:   err.response?.data,
        userId:         req.user?._id,
        transaction_id: req.body?.transaction_id,
      });
      return global.failResponse(res, err.message, err);
    }
  },
};

export default PurchaseController;
