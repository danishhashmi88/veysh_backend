import mongoose from "mongoose";
const { Schema } = mongoose;

const CmsSchema = new Schema(
  {
    title: { type: String, required: true },
    // title_ja :  { type: String, required: true },
    slug: { type: String, lowercase: true },
    status: { type: Number, default: 0 },
    menu_location: String,
    short_description: String,
    short_description_ja: String,
    description: String,
    description_ja: String,
    type: { type: String, enum: ["website", "app"], default: "website" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

const Cms = mongoose.model("Cms", CmsSchema);

export default Cms;
