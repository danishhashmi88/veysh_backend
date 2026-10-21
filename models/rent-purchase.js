import mongoose from "mongoose";
const { Schema } = mongoose;

const RentPurchaseSchema = new Schema(
  {
    item_id: {
      type: Schema.Types.ObjectId,
      ref: "Items",
      default: null,
    },
    outfit_id: {
      type: Schema.Types.ObjectId,
      ref: "Outfits",
      default: null,
    },
    purchase_rent_toggle: {
      type: Boolean,
      default: true,
    },
    purchase_rent_price: {
      type: Number,
      default: null,
    },
    images: {
      type: [String],
      default: null,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("RentPurchase", RentPurchaseSchema);
