import mongoose from "mongoose";
import { MESSAGE_TYPES } from "../global-variable.js";

const { Schema } = mongoose;

const dbSchema = new Schema(
  {
    room: { type: String },
    sender_id: { type: Schema.Types.ObjectId, ref: "Users" },
    receiver_id: { type: Schema.Types.ObjectId, ref: "Users" },
    message: { type: String },
    file_name: { type: String, default: null },
    type: { type: String, default: MESSAGE_TYPES.TEXT },
  },
  { timestamps: true }
);

const Messages = mongoose.model("Messages", dbSchema);
export default Messages;
