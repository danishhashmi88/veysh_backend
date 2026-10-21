import mongoose from "mongoose";

const { Schema } = mongoose;

const dbSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    question: { type: String, required: true },
    response: { type: Object, required: false },
    is_greeting: { type: Boolean, default: false },
    is_daily_suggestion: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const WardrobeChats = mongoose.model("WardrobeChats", dbSchema);
export default WardrobeChats;
