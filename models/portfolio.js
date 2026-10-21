import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const PortfolioSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    image_video: { type: [String], default: [] },
    visibility: {
      type: String,
      default: null,
    },
    seasons: {
      type: String,
      default: null,
    },
    style_types: {
      type: String,
      default: null,
    },
    occasions: {
     type: String,
      default: null,
    },
    brand_name: { type: String, default: null, trim: true },
    fabric: { type: String, default: null, trim: true },
    status: { type: Number, default: globals.ACTIVE },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Portfolio", PortfolioSchema);
