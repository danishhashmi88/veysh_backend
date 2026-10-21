import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const testimonialSchema = new Schema(
  {
    name: { type: String, default: null },
    status: { type: Number, default: globals.ACTIVE },
    address: { type: String, default: null },
    profile_image: { type: String },
    testimonial_text: { type: String },
    rating : {type : Number  , default : 1} ,
    city: { type: String },
    country: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  }
);


const Testimonials = mongoose.model("Testimonials", testimonialSchema);

export default Testimonials;