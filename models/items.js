import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";



const ItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    category: [{
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    }],

    sub_category: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    is_shared: {
      type: Boolean,
      default: false,
    },

    brand_name: { type: String, default: null, trim: true },

    price: { type: Number, default: null },

    purchased_on: { type: Date, default: null },

    occasion: {
      type: String,
      enum: ["party", "casual", "formal", "daily", "workout", "lounge", "ethnic", "wedding"],
      default: null,
    },

    mood: {
      type: String,
      enum: ["romantic", "casual", "happy", "festive", "professional", "edgy", "sporty", "boho", "minimalist", "glam", "street", "ethnic_traditional", "resort_vacation", "cozy", "date_night", "power"],
      default: null,
    },
    measurements: {
      chest: { type: String, default: null },
      waist: { type: String, default: null },
      hip: { type: String, default: null },
      sleeve_length: { type: String, default: null },
      inseam: { type: String, default: null },
    },

    season: {
      type: String,
      enum: ["summer", "winter", "monsoon", "autumn","spring"],
      default: null,
    },

    statuses: {
      type: String,
      enum: ["donate", "laundry", "closet", "sell", "repair", "lent"],
      default: "closet",
    },

    care: {
      type: String,
      enum: ["regular", "gentle", "dry_clean"],
      default: "regular",
    },
    status: { type: Number, default: globals.ACTIVE },
    size: {
      type: String,
      default: null,
    },

    match_with_my_size: { type: Boolean, default: false },

    colors: {
      type: [String],
      default: [],
    },

    fabric: {
      type: [String],
      default: [],
    },

    notes: { type: String, default: null },

    wear_count: { type: Number, default: null },
    cost_per_wear: { type: Number, default: 0 },

    tags: { type: [String], default: [] },

    images: {
      type: [String],
      default: [],
    },

    purchase_rent_toggle: { type: Boolean, default: false },
    purchase_rent_price: { type: Number, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Items", ItemSchema);
