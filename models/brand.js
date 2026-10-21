import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const BrandSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
  
    image: { type: String },
   
   
    status: { type: Number, default: globals.ACTIVE },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

BrandSchema.index({ title: 1 }, { unique: true });

const Brand = mongoose.model("Brand", BrandSchema);

export default Brand;

