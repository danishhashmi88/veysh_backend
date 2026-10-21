import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const SubCategorySchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    sizes: [
      {
        title: { type: String, required: true, trim: true },
      },
    ],
    status: { type: Number, default: globals.ACTIVE },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  { timestamps: true },
);


SubCategorySchema.index({ title: 1, categoryId: 1 }, { unique: true });

export default mongoose.model("SubCategory", SubCategorySchema);
