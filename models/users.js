import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const dbSchema = new Schema(
  {
    id: { type: Number },
    name: { type: String, default: null },
    first_name: { type: String, default: null },
    middle_name: { type: String, default: null },
    last_name: { type: String, default: null },
    full_name: { type: String, default: null },
    username: { type: String, default: null },
    DOB: { type: String, default: null },
    gender: { type: String, default: null },
    countryCode: { type: String, default: null },
    phone_number: { type: String, default: null },
    email: { type: String, default: null },
    password: { type: String, default: null },
    role: { type: String, default: "user" },
    otp: { type: String, default: null },
    emailVerifyToken: { type: String },
    emailVerifyExpires: { type: Date },
    validate_string: { type: String, default: null },
    privacy_accepted: { type: Boolean, default: false },
    terms_accepted: { type: Boolean, default: false },
    otp_expire: { type: Date, default: null },
    status: { type: Number, default: globals.ACTIVE },
    token: { type: String, default: null },
    address: { type: String, default: null },
    profile_image: { type: String },
    referral_link: { type: String, default: null },
    stylist_referral_link: { type: String, default: null },

    preferred_colors: {
      type: [String],
      // enum: ["red", "blue", "green", "black", "white", "pink", "purple", "orange", "yellow", "brown", "grey", "beige"],
      default: [],
    },
    profile_slugs: {
      basic: { type: Boolean, default: false },
      preferences: { type: Boolean, default: false },
      size_info: { type: Boolean, default: false },
      appearance: { type: Boolean, default: false },
      style_info: { type: Boolean, default: false },
      privacy: { type: Boolean, default: false },
    },

    stylist_profile_slugs: {
      basic: { type: Boolean, default: false },
    },

    sizes: {
      shirt_size: {
        type: String,
        default: null,
      },
      trouser_size: {
        type: String,
        default: null,
      },
      shoe_size: {
        type: String,
        default: null,
      },
      wrist_size: {
        type: String,
        default: null,
      },
    },
    goals: { type: [String], default: [] },
    brands: { type: [String], default: [] },
    marketPlace: { type: [String], default: [] },
    measurement: {
      circumference: { type: String, default: null },
      bust: { type: String, default: null },
      height: { type: String, default: null },
      shoulder: { type: String, default: null },
      waist: { type: String, default: null },
      hip: { type: String, default: null },
      inseam: { type: String, default: null },
    },
    dislikes: { type: String, default: null },
    body_type: { type: String, default: null },
    hair_color: { type: String, default: null },
    hair_type: { type: String, default: null },
    eye_color: { type: String, default: null },
    face_shape: { type: String, default: null },
    complexion: { type: String, default: null },

    full_body_image: { type: [String], default: [] },
    style_desc: { type: String, default: null },
    style: { type: String, default: null },
    mood_board: { type: String, default: null },
    pinterest_link: { type: String, default: null },
    sustain_preferences: { type: String, default: null },
    assign_task: { type: String, default: null },

    closetPrivacy: { type: String, enum: ["PUBLIC", "ONLY_ME", "STYLIST_ONLY", "STYLIST_WITH_SUGGESTIONS"], default: "ONLY_ME" },
    task: {
      type: String,
      default: null,
    },
    is_email_verified: { type: Boolean, default: false },
    google_id: { type: String, default: null },
    apple_id: { type: String, default: null },
    fcm_token: { type: String, default: null },
    accountProvider: { type: String, default: null },

    // fcm_token: { type: String, default: null },

    notification_settings: {
      push: {
        outfit_reminders: { type: Boolean, default: true },
        new_messages: { type: Boolean, default: true },
        posts_with_mention: { type: Boolean, default: true },
        posts_from_follow: { type: Boolean, default: true },
        bae_notifications: { type: Boolean, default: true },
        likes: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        // likes_comments: { type: Boolean, default: true },
      },
      email: {
        outfit_reminders: { type: Boolean, default: true },
        new_messages: { type: Boolean, default: true },
        posts_with_mention: { type: Boolean, default: true },
        posts_from_follow: { type: Boolean, default: true },
        bae_notifications: { type: Boolean, default: true },
        likes: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        // likes_comments: { type: Boolean, default: true },
      },
    },

    privacy_settings: {
      ispublic: { type: Boolean, default: true },
      only_me: { type: Boolean, default: false },
      followers_only: { type: Boolean, default: false },
    },

    // Stylist Profile
    business_name: { type: String, default: null },
    professional_category_id: { type: String, default: null },
    tagline: { type: String, default: null },
    short_bio: { type: String, default: null },
    long_bio: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: null },
    experience: { type: String, default: null },
    expertise: { type: [String], default: [] },
    certificates: { type: [String], default: [] },
    social_media_details: { type: Array, default: [] },
    display_preferences: {
      public_profile: { type: Boolean, default: true },
      show_phone_number_publicly: { type: Boolean, default: true },
      display_certificates_and_credentials: { type: Boolean, default: true },
      show_social_links: { type: Boolean, default: true },
    },

    profile_completion_percentage: { type: Number, default: 0 },
    ai_usage_count: { type: Number, default: 0 },
    bio: { type: String, default: null },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    following_users: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    followers_users: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    blocked_users: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users", default: null },
  },
  {
    timestamps: true,
  },
);

const Users = mongoose.model("Users", dbSchema);
export default Users;
