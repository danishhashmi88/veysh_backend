import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Logs every IAP event — purchase, renewal, restore, cancel, refund, expiry, webhook.
 * One document per event (not per subscription).
 */
const IapTransactionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    user_subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null,
      index: true,
    },

    subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },

    product_id: { type: String, default: null, index: true },

    // Apple StoreKit
    transaction_id: { type: String, default: null, index: true },
    original_transaction_id: { type: String, default: null, index: true },

    // Android
    purchase_token: { type: String, default: null },
    order_id: { type: String, default: null },

    event_type: {
      type: String,
      enum: [
        "PURCHASE",
        "RENEWAL",
        "RESTORE",
        "CANCEL",
        "EXPIRED",
        "REFUND",
        "REVOKE",
        "GRACE_PERIOD",
        "FAIL_TO_RENEW",
        "OFFER_REDEEMED",
        "PRICE_INCREASE",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    // APP = triggered by user action, WEBHOOK = triggered by Apple/Google server notification
    source: {
      type: String,
      enum: ["APP", "WEBHOOK"],
      default: "APP",
    },

    paid_amount: { type: Number, default: 0 },
    currency: { type: String, default: null },

    purchase_date: { type: Date, default: null },
    expires_date: { type: Date, default: null },

    environment: {
      type: String,
      enum: ["Sandbox", "Production"],
      default: "Sandbox",
    },

    // full raw verified transaction from Apple/Google
    raw_transaction: { type: Schema.Types.Mixed, default: null },

    // webhook notification type (only for WEBHOOK source)
    notification_type: { type: String, default: null },
    notification_subtype: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("IapTransaction", IapTransactionSchema);
