import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Stores every raw Apple server-to-server notification.
 * user_id is resolved from the subscription lookup — null if not found.
 * Used for audit, debugging, and replaying failed events.
 */
const AppleWebhookLogSchema = new Schema(
  {
    // resolved from userSubscription lookup
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      default: null,
      index: true,
    },

    user_subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null,
    },

    subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    notification_type: { type: String, default: null, index: true },
    notification_subtype: { type: String, default: null },

    original_transaction_id: { type: String, default: null, index: true },
    transaction_id: { type: String, default: null, index: true },
    product_id: { type: String, default: null },
    bundle_id: { type: String, default: null },

    environment: {
      type: String,
      enum: ["Sandbox", "Production", null],
      default: null,
    },

    // full decoded Apple JWT payload
    decoded_payload: { type: Schema.Types.Mixed, default: null },

    // full decoded signedTransactionInfo
    decoded_transaction: { type: Schema.Types.Mixed, default: null },

    // whether this webhook was handled successfully
    processed: { type: Boolean, default: false, index: true },

    // error message if processing failed
    error: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AppleWebhookLog", AppleWebhookLogSchema);
