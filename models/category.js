import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const CategorySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    image: { type: String },
    type: {
      type: String,
      enum: ["outfit", "item"],
      required: true,
    },
    sizes: [
      {
        title: { type: String, required: true, trim: true },
      },
    ],
    status: { type: Number, default: globals.ACTIVE },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ title: 1, type: 1 }, { unique: true });

const Category = mongoose.model("Category", CategorySchema);

export default Category;

