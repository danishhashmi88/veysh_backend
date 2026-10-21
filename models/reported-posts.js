import mongoose from "mongoose";
const { Schema } = mongoose;

const ReportedPostsSchema = new Schema(
  {
    user_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Users", 
      required: true 
    },
    post_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Posts", 
      required: true 
    },
    reason: { 
      type: String, 
      required: true, 
      trim: true 
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("ReportedPosts", ReportedPostsSchema);
