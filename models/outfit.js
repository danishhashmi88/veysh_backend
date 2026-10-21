import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const OutfitSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    category: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
         required: true,
      }
    ],
    is_shared: {
      type: Boolean,
      default: false,
    },

    // item_id: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Items",
    // },

    item_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "Items",
      }
    ],

    sub_category: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
    },

    occasion: {
      type: String,
      enum: ["party", "casual", "formal", "daily", "workout", "lounge", "ethnic", "wedding"],
      default: null,
    },

    suitable: {
      type: String,
      enum: ["winter", "summer", "rainy"],
      default: null,
    },

    status: { type: Number, default: globals.ACTIVE },


    notes: { type: String, default: null },
    description: { type: String, default: null },
    tags: { type: [String], default: [] },

    // user_id: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Users",
    //   required: true,
    // },
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

export default mongoose.model("Outfits", OutfitSchema);
