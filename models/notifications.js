import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, default: null, trim: true },
    body: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    actorUserId: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notifications", NotificationsSchema);
