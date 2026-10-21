import mongoose from "mongoose";
const { Schema } = mongoose;


const GlobalSettingsSchema = new Schema(
  {
    title: { type: String },
    admin_email: { type: String },
    phone_number: { type: String },
    address: { type: String },
    copy_right_text: { type: String },
    website: { type: String },
    play_store_url: { type: String },
    app_store_url: { type: String },
    last_rest_id: { type: Number, default: 0 },
    // monthly_restaurant_enrollment_cost: { type: Number },
    // yearly_restaurant_enrollment_cost: { type: Number },
    social_media_details: { type: Array, default: [] },
    bae_media_details: { type: Array, default: [] }
  },
  {
    timestamps: true,
  }
);


const GlobalSettings = mongoose.model("GlobalSettings", GlobalSettingsSchema);

export default GlobalSettings;
