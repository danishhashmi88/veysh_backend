import mongoose from "mongoose";
const { Schema } = mongoose;

const dbSchema = new Schema(
  {
    title: { type: String, default: null },
    short_desc: { type: String, default: null },
    detailed_desc: { type: String, default: null },
    duration: { type: Number, default: null },
    flat_price: { type: Number, default: null },
    hourly_price: { type: Number, default: null },
    delivery_type: { type: String, default: null },
    add_ons: { type: [String], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);

const Portfolio_Service
 = mongoose.model("Portfolio_Service", dbSchema);
export default Portfolio_Service;
