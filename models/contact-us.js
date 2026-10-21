import mongoose from "mongoose";
const { Schema } = mongoose;

const contactUsSchema = new Schema(
 {
    name: {type: String, default: null},
    email: { type: String, default: null },
    subject: { type: String, default: null },
    message: {type: String, default: null},
    type: { type: String, default: null },
    phone: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

const ContactUs = mongoose.model("Contact-us", contactUsSchema);

export default ContactUs;

