import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const UserSubscriptionSchema = new Schema(
  {
    // snapshot of plan
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true },

    subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },

    // user
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,

    },

    // duration snapshot
    duration_type: {
      type: String,
      enum: ["month", "year"],
      required: true,
    },


    // validity
    start_date: {
      type: Date,
      required: true,
      index: true,
    },

    end_date: {
      type: Date,
      required: true,
      index: true,
    },

    // payment info
    paid_amount: { type: Number, default: 0 },
    credit_amount: { type: Number, default: 0 },

    // Razorpay (for subscription purchase)

    status: {
      type: Number,
      default: globals.ACTIVE, // 1 = active, 0 = expired/cancelled
      index: true,
    },

    platform: {
      type: String,
      enum: ["ios", "android"],
      required: false,
    },

    product_id: {
      type: String,
      required: false,
      index: true,
    },

    transaction_id: {
      type: String,
      default: undefined,
    },

    original_transaction_id: {
      type: String,
      default: null,
      index: true,
    },

    purchase_token: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    order_id: {
      type: String,
      default: null,
    },
    
    subscription_state: {
      type: String,
      default: null,
    },
    
    acknowledgement_state: {
      type: String,
      default: null,
    },
    
    verified: {
      type: Boolean,
      default: false,
    },
    
    verified_at: {
      type: Date,
      default: null,
    },

    receipt: {
      type: String,
      default: null,
    },
    
    subscription_access: [
      {
        slug: { type: String, trim: true, default: "" },
        key: { type: String, trim: true, default: "" },
        label: { type: String, trim: true, default: "" },
        value: { type: String, trim: true, default: "" },
      },
    ],
    benefits: { type: [String], default: [] },
    description: { type: String, default: null },
    activated: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true },
);


UserSubscriptionSchema.index(
  { user_id: 1 },
  {
    unique: true,
    partialFilterExpression: { activated: true },
  },
);

export default mongoose.model("UserSubscription", UserSubscriptionSchema);
