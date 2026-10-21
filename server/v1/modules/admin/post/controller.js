import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import Posts from "../../../../../models/posts.js";
import { MESSAGE, PER_PAGE_RECORDS } from "../../../../../global-variable.js";
const PostController = {

  details: async (req, res) => {
    try {
      const postId = req.params.id;

      if (!ObjectId.isValid(postId)) {
        return global.failResponse(res, "Invalid Post ID");
      }

      let post = await Posts.findById(postId)
        .populate("createdBy", "first_name last_name email profile_image") 
        .populate("comments.userId", "first_name last_name email profile_image") 
        .populate("likes", "first_name last_name email profile_image"); 
      
      if (!post) {
        return global.failResponse(res, "Post not found");
      }

      // Format response to include counts and build URLs
      post = post.toObject();
      post.likesCount = (post.likes || []).length;
      post.commentsCount = (post.comments || []).length;
      post.images = global.buildUploadUrls(post.images || []);
      post.videos = global.buildUploadUrls(post.videos || []);
      
      if (post.createdBy) {
        post.createdBy.profile_image = global.buildUserImageUrl(post.createdBy.profile_image);
      }

      return global.successResponse(
        res,
        global.msg(req, res, "post_details"),
        post
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  // list: async (req, res) => {
  //   try {
  //     const posts = await Posts.find({})
  //       .populate("createdBy", "first_name last_name email")
  //       .populate("comments.userId", "first_name last_name email")
  //       .populate("likes", "first_name last_name email")
  //       .sort({ createdAt: -1 });
  //     return global.successResponse(
  //       res,
  //       global.msg(req, res, "all_posts_fetched"),
  //       posts
  //     );
  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },
 
  list: async (req, res) => {
  try {
    // Global search fields
    const globalSearch = ["caption", "name", "location"];
    const page = Number(req.body.page) || 1;
    const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    // Build query
    const query = {
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    // Sorting
    let sorting = await global.getSorting(req);
    if (!sorting || Object.keys(sorting).length === 0) {
      sorting = { createdAt: -1 };
    }

    // Run parallel queries
    async.parallel(
      {
        list: (callback) => {
          Posts.aggregate([
            { $match: query },
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },
            // Populate createdBy
            {
              $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, first_name: 1, last_name: 1, email: 1, profile_image: 1 } },
                ],
                as: "createdBy",
              },
            },
            // Populate comments.userId
            {
              $lookup: {
                from: "users",
                localField: "comments.userId",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, first_name: 1, last_name: 1, email: 1, profile_image: 1 } },
                ],
                as: "commentUsers",
              },
            },
            // Populate likes
            {
              $lookup: {
                from: "users",
                localField: "likes",
                foreignField: "_id",
                pipeline: [
                  { $project: { _id: 1, first_name: 1, last_name: 1, email: 1, profile_image: 1 } },
                ],
                as: "likeUsers",
              },
            },
            // Format final fields
            {
              $project: {
                _id: 1,
                name: 1,
                caption: 1,
                images: 1,
                videos: 1,
                tags: 1,
                location: 1,
                createdAt: 1,
                createdBy: { $arrayElemAt: ["$createdBy", 0] },
                likesCount: { $size: "$likeUsers" },
                commentsCount: { $size: "$comments" },
              },
            },
          ])
            .exec()
            .then((result) => {
              // Format URLs
              const formattedResult = result.map((post) => {
                post.images = global.buildUploadUrls(post.images || []);
                post.videos = global.buildUploadUrls(post.videos || []);
                if (post.createdBy) {
                  post.createdBy.profile_image = global.buildUserImageUrl(post.createdBy.profile_image);
                }
                return post;
              });
              callback(null, formattedResult);
            })
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          Posts.countDocuments(query)
            .then((count) => callback(null, count))
            .catch((err) => callback(err));
        },

        page: (callback) => callback(null, page),
        offset: (callback) => callback(null, skip),
        per_page: (callback) => callback(null, perPage),
      },
      (err, result) => {
        if (err) {
          return global.failResponse(res, err.message, err);
        }
        return global.successResponse(res, global.msg(req, res, "all_posts_fetched"), result);
      }
    );
  } catch (err) {
    return global.failResponse(res, err.message, err);
  }
},
 
  delete: async (req, res) => {
  try {
    const postId = req.params.id.replace(/^:/, '');
    const post = await Posts.findById(postId);
    if (!post) {
      return global.failResponse(res, "Post not found");
    }
    const deletedData = await Posts.findByIdAndDelete(postId);
    return global.successResponse(
      res,
      "Deleted Successfully",
      deletedData  
    );

  } catch (err) {
    return global.failResponse(res, err.message, err);
  }
  },
};

export default PostController;