import mongoose from "mongoose";
const { Schema } = mongoose;
import globalVariable from "../global-variable.js";

const LookbookSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["post", "outfit", "website"],
      required: true,
    },
    post_id: {
      type: Schema.Types.ObjectId,
      ref: "Posts",
      default: null,
    },
    outfit_id: {
      type: Schema.Types.ObjectId,
      ref: "Outfits",
      default: null,
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    website_link: {
      type: String,
      default: null,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    isLookbook: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Number,
      default: globalVariable.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users"
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Lookbook", LookbookSchema);
