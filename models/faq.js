import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const FAQSchema = new Schema(
  {
    title: { type: String, required: true },
    status : { type: Number, default: globals.ACTIVE },
    description: String,
    type: { type: String, enum: ["website", "app"], default: "website" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

const FAQ = mongoose.model("FAQ", FAQSchema);

export default FAQ;

