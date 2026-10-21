import mongoose from "mongoose";

const { Schema } = mongoose;
import globals from "../global-variable.js";
const EmailTemplatesSchema = new Schema(
  {
    title: String,
    slug: String,
    type: String,
    options: { type: Array, default: [] },
    subject: String,
    description: String,
    user_id: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    status: { type: Number, default: globals.ACTIVE },
    description_ja: String,
  },
  {
    timestamps: true,
  }
);

const EmailTemplates = mongoose.model("EmailTemplates", EmailTemplatesSchema);

export default EmailTemplates;
