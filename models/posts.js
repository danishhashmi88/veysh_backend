import mongoose from "mongoose";
const { Schema } = mongoose;

const CommentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);



const PostsSchema = new Schema(
  {
    name: { type: String, default: null, trim: true },

    caption: { type: String, default: null },
    tags: { type: [String], default: [] },
    // user_id: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Users",
    //   required: true,
    // },
    collaborate: { type: Boolean, default: false },
    images: {
      type: [String],
      default: [],
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    comments: [CommentSchema],
    hideLikes: { type: Boolean, default: false },
    hideComments: { type: Boolean, default: false },
    turnOffComments: { type: Boolean, default: false },
    followers_only: { type: Boolean, default: false },
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    location: { type: String, default: null },

    videos: {
      type: [String],
      default: [],
    },

    thumbnail: { type: String, default: null },
    // collection_id: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Users",
    //   required: true,
    // },

    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Posts", PostsSchema);
