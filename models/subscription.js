import mongoose from "mongoose";
const { Schema } = mongoose;

import globals from "../global-variable.js";

const SubscriptionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    status: { type: Number, default: globals.ACTIVE },
    price: { type: Number, default: null },
    description: { type: String, default: null },
    benefits: { type: [String], default: [] },
    duration_type: {
      type: String,
      enum: ["month", "year"],
      required: true,
    },
    product_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subscription_access: [
      {
        slug: { type: String, trim: true, default: "" },
        key: { type: String, trim: true, default: "" },
        label: { type: String, trim: true, default: "" },
        value: { type: String, trim: true, default: "" },
      },
    ],
    limit_type: { type: String, enum: ["day", "month", "total"], default: "total" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Subscription", SubscriptionSchema);
