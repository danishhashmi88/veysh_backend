import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
const { Types } = mongoose;
import async from "async";
import { MESSAGE, ACTIVE, NOTIFICATIONS_TYPES } from "../../../../../global-variable.js";
import { sendFCMToToken } from "../../../../../helpers/firebase-notification.js";
import path from "path";

import global from "../../../../../helpers/global-functions.js";
// models
import posts from "../../../../../models/posts.js";
import ReportedPosts from "../../../../../models/reported-posts.js";
import Lookbook from "../../../../../models/lookbook.js";
import UserModel from "../../../../../models/users.js";
import Notifications from "../../../../../models/notifications.js";
import UserSubscription from "../../../../../models/user-subscription.js";
import subscriptionHelper from "../../../../../helpers/subscription-helper.js";

import { fileURLToPath } from "url";
import { UPLOAD_FILE_PATH } from "../../../../../global-variable.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PostsController = {
  save: async (req, res) => {
    try {
      const { name, tags, caption, collaborate, hideLikes, hideComments, turnOffComments, location, tagged_users, followersOnly } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      // Check subscription limit
      const limitCheck = await subscriptionHelper.checkLimit(userId, "post");
      console.log('limitChecklimitChecklimitCheck',limitCheck)
      if (limitCheck.limitReached) {
        return global.successResponse(res, limitCheck.message, {
          limit_reached: true,
          limit: limitCheck.limit,
          current_usage: limitCheck.currentUsage
        });
      }

      let formattedTitle = null;

      if (name && name.trim()) {
        formattedTitle = global.capitalizeFirstLetter(name.trim());

        const existingItem = await posts.findOne({
          name: formattedTitle,
          createdBy: userId,
        });

        if (existingItem) {
          return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
        }
      }

      let itemData = {
        name: formattedTitle,
        caption,
        collaborate,
        tags,
        hideLikes: hideLikes === "true" || hideLikes === true,
        hideComments: hideComments === "true" || hideComments === true,
        turnOffComments: turnOffComments === "true" || turnOffComments === true,
        followers_only: followersOnly === "true" || followersOnly === true,
        location: location || null,
        createdBy: userId,
        updatedBy: userId,
      };

      if (tags !== undefined) {
        itemData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      }

      if (tagged_users !== undefined) {
        console.log("[Posts] Raw tagged_users from req.body:", tagged_users, typeof tagged_users);
        try {
          const parsed = typeof tagged_users === "string" && (tagged_users.startsWith("[") || tagged_users.startsWith("{"))
            ? JSON.parse(tagged_users)
            : tagged_users;

          let userIds = Array.isArray(parsed) ? parsed : [parsed];
          itemData.tagged_users = userIds.filter(id => id && ObjectId.isValid(id)).map(id => new ObjectId(id));
          console.log("[Posts] Processed itemData.tagged_users:", itemData.tagged_users);
        } catch (e) {
          console.error("[Posts] tagged_users parse error:", e.message);
        }
      }

      if (caption !== undefined) itemData.caption = caption;

      // ✅ Images Upload
      const images = await global.uploadFile(req, "images", "posts");

      if (images) {
        let imageArray = [];
        if (Array.isArray(images)) {
          imageArray = images.map((img) => `uploads/posts/${img}`);
        } else if (typeof images === "string") {
          imageArray = images.split(",").map((img) => `uploads/posts/${img.trim()}`);
        }
        itemData.images = imageArray;
      }

      // ✅ Videos Upload + Thumbnail Extract
      const videos = await global.uploadFile(req, "videos", "posts");

      if (videos) {
        let videoArray = [];
        if (Array.isArray(videos)) {
          videoArray = videos.map((vid) => `uploads/posts/${vid}`);
        } else if (typeof videos === "string") {
          videoArray = videos.split(",").map((vid) => `uploads/posts/${vid.trim()}`);
        }
        itemData.videos = videoArray;

        // 👇 Pehli video se thumbnail nikalo
        try {
          const firstVideoName = Array.isArray(videos) ? videos[0] : videos;

          // UPLOAD_FILE_PATH already "...../uploads/" tak ka path hai
          const videoFullPath = path.join(UPLOAD_FILE_PATH, "posts", firstVideoName);
          const outputDir = path.join(UPLOAD_FILE_PATH, "posts");

          const thumbName = await global.extractThumbnail(videoFullPath, outputDir);
          itemData.thumbnail = `uploads/posts/${thumbName}`;
          console.log("[Posts] Thumbnail extracted:", itemData.thumbnail);
        } catch (e) {
          // console.error("[Posts] Thumbnail extract error:", e.message);
          console.error("[Posts] Thumbnail extract FULL error:", e);
        }
      }

      // ✅ Post Create
      const newItem = await posts.create(itemData);

      let post = await posts.findById(newItem._id)
        .populate("tagged_users", "name full_name username profile_image")
        .lean();

      if (post.tagged_users && Array.isArray(post.tagged_users)) {
        post.tagged_users = post.tagged_users.map(u => ({
          _id: u._id,
          name: u.full_name || u.name || u.username,
          username: u.username,
          profile_image: global.buildUserImageUrl(u.profile_image)
        }));
      }

      post.images = global.buildUploadUrls(post.images);
      post.videos = global.buildUploadUrls(post.videos);

      // ✅ Thumbnail URL build karo
      if (post.thumbnail) {
        post.thumbnail = global.buildUploadUrls([post.thumbnail])?.[0];
      }

      // ✅ Push Notifications
      (async () => {
        try {
          const creator = await UserModel.findById(userId).select("first_name name followers_users").lean();
          const creatorName = creator?.first_name || creator?.name || "Someone";

          // 1. Notify Tagged Users
          if (newItem.tagged_users && newItem.tagged_users.length > 0) {
            const taggedUsers = await UserModel.find({ _id: { $in: newItem.tagged_users } }).select("fcm_token notification_settings").lean();
            for (const tUser of taggedUsers) {
              const allowPush = tUser.notification_settings?.push?.posts_with_mention !== false;
              if (allowPush) {
                const title = "You were tagged";
                const body = `${creatorName} tagged you in a post`;
                const pushData = { type: NOTIFICATIONS_TYPES.POST_TAG, postId: String(newItem._id) };

                try {
                  await Notifications.create({
                    userId: tUser._id,
                    type: NOTIFICATIONS_TYPES.POST_TAG,
                    title, body,
                    data: { postId: String(newItem._id) },
                    actorUserId: userId,
                  });
                  console.log("[Notification] Tag DB saved, to:", tUser._id, "postId:", newItem._id);
                } catch (dbErr) {
                  console.error("[Notification] Tag DB error:", dbErr.message);
                }

                if (tUser.fcm_token) {
                  sendFCMToToken(tUser.fcm_token, { title, body, data: pushData }).then(res => {
                    console.log("[Notification] Tag FCM res:", res, "to:", tUser._id);
                  }).catch(e => console.error("[FCM] Mention error:", e.message));
                }
              }
            }
          }

          // 2. Notify Followers
          if (creator.followers_users && creator.followers_users.length > 0) {
            const followers = await UserModel.find({ _id: { $in: creator.followers_users } }).select("fcm_token notification_settings").lean();
            for (const follower of followers) {
              const allowPush = follower.notification_settings?.push?.posts_from_follow !== false;
              if (allowPush) {
                const title = "New post from someone you follow";
                const body = `${creatorName} shared a new post`;
                const pushData = { type: NOTIFICATIONS_TYPES.POST_FOLLOW, postId: String(newItem._id) };

                try {
                  await Notifications.create({
                    userId: follower._id,
                    type: NOTIFICATIONS_TYPES.POST_FOLLOW,
                    title, body,
                    data: { postId: String(newItem._id) },
                    actorUserId: userId,
                  });
                  console.log("[Notification] Follow post DB saved, to:", follower._id, "postId:", newItem._id);
                } catch (dbErr) {
                  console.error("[Notification] Follow post DB error:", dbErr.message);
                }

                if (follower.fcm_token) {
                  sendFCMToToken(follower.fcm_token, { title, body, data: pushData }).then(res => {
                    console.log("[Notification] Follow post FCM res:", res, "to:", follower._id);
                  }).catch(e => console.error("[FCM] Follow error:", e.message));
                }
              }
            }
          }
        } catch (err) {
          console.error("[Notification] save error:", err.message);
        }
      })();

      console.log("[Posts] Final post response tagged_users count:", post.tagged_users?.length || 0);

      return global.successResponse(res, global.msgByReq(req, "post_added_success"), { posts: post });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  details: async (req, res) => {
    try {
      const { o_id } = req.query;
      const currentUserId = req.user._id;

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid item ID", {});
      }

      const result = await posts.aggregate([
        { $match: { _id: new ObjectId(o_id) } },
        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),
        {
          $lookup: {
            from: "users",
            localField: "tagged_users",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                  full_name: 1,
                  username: 1,
                  profile_image: 1,
                }
              }
            ],
            as: "tagged_users_details"
          }
        },
        {
          $project: {
            name: 1,
            caption: 1,
            tags: 1,
            images: 1,
            videos: 1,
            hideLikes: 1,
            hideComments: 1,
            turnOffComments: 1,
            followers_only: 1,
            likes: 1,
            tagged_users: "$tagged_users_details",
            thumbnail: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ]);

      const post = result[0] || null;
      if (!post) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
      }

      const creatorId = post.createdBy?._id;
      if (creatorId && creatorId.toString() !== currentUserId.toString()) {
        const creator = await UserModel.findById(creatorId)
          .select("followers_users privacy_settings")
          .lean();
        const privacySettings = creator?.privacy_settings || {};
        const isFollower = (creator?.followers_users || []).some(
          (id) => id && id.toString() === currentUserId.toString(),
        );

        if (privacySettings.only_me) {
          return global.failResponse(res, "This post is private", {});
        }
        if (privacySettings.followers_only && !isFollower) {
          return global.failResponse(res, "This post is for followers only", {});
        }
        if (post.followers_only && !isFollower) {
          return global.failResponse(res, "This post is for followers only", {});
        }
      }

      const likesArray = post.likes || [];
      const currentUserStr = currentUserId.toString();
      const isLiked = likesArray.some(
        (id) => (id && (id.toString ? id.toString() : String(id)) === currentUserStr),
      );

      let likedBy = (likesArray || [])
        .filter((id) => id != null)
        .map((id) => (id.toString ? id.toString() : String(id)));

      const currentUser = await UserModel.findById(currentUserId).select("blocked_users").lean();
      const blockedUsers = (currentUser && currentUser.blocked_users) || [];
      if (blockedUsers.length > 0) {
        const blockedSet = new Set(blockedUsers.map((b) => (b && b.toString ? b.toString() : String(b))));
        likedBy = likedBy.filter((id) => !blockedSet.has(id));
      }

      post.images = global.buildUploadUrls(post.images || []);
      post.videos = post.videos ? global.buildUploadUrls(post.videos) : [];

      if (post.thumbnail) {
        post.thumbnail = global.buildUploadUrls([post.thumbnail])?.[0];
      }
      if (post.tagged_users && Array.isArray(post.tagged_users)) {
        post.tagged_users = post.tagged_users.map(u => ({
          ...u,
          profile_image: global.buildUserImageUrl(u.profile_image)
        }));
      }
      if (post.createdBy && post.createdBy.profile_image) {
        post.createdBy.profile_image = global.buildUserImageUrl(post.createdBy.profile_image);
      }
      if (post.updatedBy && post.updatedBy.profile_image) {
        post.updatedBy.profile_image = global.buildUserImageUrl(post.updatedBy.profile_image);
      }

      post.isLiked = isLiked;
      post.likedBy = likedBy;

      global.applyPostHideFlags(post, currentUserId);

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, post);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  edit: async (req, res) => {
    try {
      const { o_id, name, tags, caption, collaborate, hideLikes, hideComments, turnOffComments, location, existing_images, existing_videos, tagged_users, followersOnly} = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid post ID", {});
      }

      const postId = new ObjectId(o_id);

      let updateData = {};

      if (name !== undefined) {
        if (!name || !name.trim()) {
          updateData.name = null;
        } else {
          const formattedTitle = global.capitalizeFirstLetter(name.trim());

          const existingItem = await posts.findOne({
            name: formattedTitle,
            createdBy: userId,
            _id: { $ne: postId },
          });

          if (existingItem) {
            return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
          }

          updateData.name = formattedTitle;
        }
      }

      if (caption !== undefined) updateData.caption = caption;

      if (collaborate !== undefined) {
        updateData.collaborate = collaborate === "true" || collaborate === true;
      }

      if (hideLikes !== undefined) {
        updateData.hideLikes = hideLikes === "true" || hideLikes === true;
      }

      if (hideComments !== undefined) {
        updateData.hideComments = hideComments === "true" || hideComments === true;
      }

      if (turnOffComments !== undefined) {
        updateData.turnOffComments = turnOffComments === "true" || turnOffComments === true;
      }

      if (followersOnly !== undefined) {
        updateData.followers_only = followersOnly === "true" || followersOnly === true;
      }

      if (location !== undefined) {
        updateData.location = location || null;
      }

      if (tags !== undefined) {
        try {
          updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
        } catch (e) {
          return global.failResponse(res, "Invalid tags format", {});
        }
      }

      if (tagged_users !== undefined) {
        try {
          const parsed = typeof tagged_users === "string" && (tagged_users.startsWith("[") || tagged_users.startsWith("{"))
            ? JSON.parse(tagged_users)
            : tagged_users;

          let userIds = Array.isArray(parsed) ? parsed : [parsed];
          updateData.tagged_users = userIds.filter(id => id && ObjectId.isValid(id)).map(id => new ObjectId(id));
        } catch (e) {
          console.error("[Posts] edit tagged_users parse error:", e.message);
        }
      }

      const oldPost = await posts.findOne({ _id: postId, createdBy: userId }, { images: 1, videos: 1, thumbnail: 1, tagged_users: 1 });

      if (!oldPost) {
        return global.failResponse(res, "Post not found or unauthorized", {});
      }

      const normalizePath = (p) => {
        if (!p) return null;
        if (p.startsWith("http")) {
          return p.replace(process.env.BASE_URL + "/", "");
        }
        return p.replace(/^\/+/, "");
      };

      // Timestamp suffix hata ke original name nikalo
      const getCleanName = (filePath) => {
        const fileName = filePath.split("/").pop();
        return fileName.replace(/\d{10,}\./, ".");
      };

      /* ========= IMAGES ========= */

      let finalImages = Array.isArray(oldPost.images) ? [...oldPost.images] : [];

      const uploadedImages = await global.uploadFile(req, "images", "posts");

      if (existing_images !== undefined) {
        let clientImages = [];
        try {
          clientImages = typeof existing_images === "string" ? JSON.parse(existing_images) : existing_images;
        } catch (e) {
          return global.failResponse(res, "Invalid existing_images format", {});
        }

        if (Array.isArray(clientImages)) {
          const normalizedClientImages = clientImages.map(normalizePath).filter(Boolean);
          finalImages = finalImages.filter((img) => normalizedClientImages.includes(img));
        }
      }

      if (uploadedImages) {
        const existingImageCleanNames = finalImages.map(getCleanName);

        const newImages = (Array.isArray(uploadedImages) ? uploadedImages : [uploadedImages])
          .filter(i => !existingImageCleanNames.includes(getCleanName(i)))
          .map(i => `uploads/posts/${i}`);

        finalImages.push(...newImages);
      }

      finalImages = [...new Set(finalImages)];

      if (uploadedImages || existing_images !== undefined) {
        updateData.images = finalImages;
      }

      /* ========= VIDEOS ========= */

      let finalVideos = Array.isArray(oldPost.videos) ? [...oldPost.videos] : [];

      const uploadedVideos = await global.uploadFile(req, "videos", "posts");

      if (existing_videos !== undefined) {
        let clientVideos = [];
        try {
          clientVideos = typeof existing_videos === "string" ? JSON.parse(existing_videos) : existing_videos;
        } catch (e) {
          return global.failResponse(res, "Invalid existing_videos format", {});
        }

        if (Array.isArray(clientVideos)) {
          const normalizedClientVideos = clientVideos.map(normalizePath).filter(Boolean);
          finalVideos = finalVideos.filter((v) => normalizedClientVideos.includes(v));
        }
      }

      if (uploadedVideos) {
        const existingVideoCleanNames = finalVideos.map(getCleanName);

        const newVideos = (Array.isArray(uploadedVideos) ? uploadedVideos : [uploadedVideos])
          .filter(v => !existingVideoCleanNames.includes(getCleanName(v)))
          .map(v => `uploads/posts/${v}`);

        finalVideos.push(...newVideos);
      }

      finalVideos = [...new Set(finalVideos)];

      if (uploadedVideos || existing_videos !== undefined) {
        updateData.videos = finalVideos;
      }

      // NAYA VIDEO AAYA TO HI THUMBNAIL EXTRACT KARO
      if (uploadedVideos) {
        const existingVideoCleanNames = (Array.isArray(oldPost.videos) ? oldPost.videos : []).map(getCleanName);
        const trulyNewVideos = (Array.isArray(uploadedVideos) ? uploadedVideos : [uploadedVideos])
          .filter(v => !existingVideoCleanNames.includes(getCleanName(v)));

        if (trulyNewVideos.length > 0) {
          try {
            const firstVideoName = trulyNewVideos[0];
            const videoFullPath = path.join(UPLOAD_FILE_PATH, "posts", firstVideoName);
            const outputDir = path.join(UPLOAD_FILE_PATH, "posts");

            const thumbName = await global.extractThumbnail(videoFullPath, outputDir);
            updateData.thumbnail = `uploads/posts/${thumbName}`;
            console.log("[Posts] Edit - Thumbnail extracted:", updateData.thumbnail);
          } catch (e) {
            console.error("[Posts] Edit - Thumbnail extract error:", e.message);
          }
        }
      }

      updateData.updatedBy = userId;

      /* ========================================================= */

      const updatedPost = await posts.findOneAndUpdate(
        { _id: postId, createdBy: userId },
        { $set: updateData },
        { new: true }
      );

      if (!updatedPost) {
        return global.failResponse(res, "Post not found or unauthorized", {});
      }

      // Push Notifications for newly tagged users
      (async () => {
        try {
          if (updateData.tagged_users && updateData.tagged_users.length > 0) {
            const oldTaggedSet = new Set((oldPost.tagged_users || []).map(id => id.toString()));
            const newlyTaggedIds = updateData.tagged_users.filter(id => !oldTaggedSet.has(id.toString()));

            if (newlyTaggedIds.length > 0) {
              const creator = await UserModel.findById(userId).select("first_name name").lean();
              const creatorName = creator?.first_name || creator?.name || "Someone";

              const taggedUsers = await UserModel.find({ _id: { $in: newlyTaggedIds } }).select("fcm_token notification_settings").lean();
              for (const tUser of taggedUsers) {
                const allowPush = tUser.notification_settings?.push?.posts_with_mention !== false;
                if (allowPush) {
                  const title = "You were tagged";
                  const body = `${creatorName} tagged you in a post`;
                  const pushData = { type: NOTIFICATIONS_TYPES.POST_TAG, postId: String(postId) };

                  try {
                    await Notifications.create({
                      userId: tUser._id,
                      type: NOTIFICATIONS_TYPES.POST_TAG,
                      title, body,
                      data: { postId: String(postId) },
                      actorUserId: userId,
                    });
                    console.log("[Notification] Edit Tag DB saved, to:", tUser._id, "postId:", postId);
                  } catch (dbErr) {
                    console.error("[Notification] Edit Tag DB error:", dbErr.message);
                  }

                  if (tUser.fcm_token) {
                    sendFCMToToken(tUser.fcm_token, { title, body, data: pushData }).then(res => {
                      console.log("[Notification] Edit Tag FCM res:", res, "to:", tUser._id);
                    }).catch(e => console.error("[FCM] Edit Mention error:", e.message));
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("[Notification] edit error:", err.message);
        }
      })();

      let post = await posts.findById(postId)
        .populate("tagged_users", "name full_name username profile_image")
        .lean();

      if (post && post.tagged_users && Array.isArray(post.tagged_users)) {
        post.tagged_users = post.tagged_users.map(u => ({
          _id: u._id,
          name: u.full_name || u.name || u.username,
          username: u.username,
          profile_image: global.buildUserImageUrl(u.profile_image)
        }));
      }

      if (post) {
        post.images = global.buildUploadUrls(post.images);
        post.videos = global.buildUploadUrls(post.videos);

        if (post.thumbnail) {
          post.thumbnail = global.buildUploadUrls([post.thumbnail])?.[0];
        }
      }

      return global.successResponse(res, global.msg(req, res, "Post updated successfully"), { post });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  list: async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.user._id);
      const filter = { createdBy: userId };

      const [list, total_records] = await Promise.all([
        posts
          .find(filter)
          .select("name caption collaborate videos images tags thumbnail createdAt createdBy likes comments hideLikes hideComments turnOffComments location tagged_users followers_only")
          .populate({
            path: "createdBy",
            select: "name email avatar username full_name profile_image",
          })
          .populate({
            path: "tagged_users",
            select: "name email avatar username full_name profile_image",
          })
          .lean(),
        posts.countDocuments(filter),
      ]);

      // Ek baar mein saari lookbook entries fetch karo
      const postIds = list.map(item => item._id);
      const lookbookEntries = await Lookbook.find({
        createdBy: userId,
        type: "post",
        post_id: { $in: postIds }
      }).select("post_id").lean();

      // Set banao fast lookup ke liye
      const lookbookPostIds = new Set(
        lookbookEntries.map(l => l.post_id.toString())
      );

      const finalList = list.map((item) => {
        let createdBy = item.createdBy;

        if (createdBy) {
          createdBy = {
            _id: createdBy._id,
            name: createdBy.name,
            full_name: createdBy.full_name,
            username: createdBy.username,
            email: createdBy.email,
            profile_image: global.buildUserImageUrl(createdBy.profile_image),
          };
        }

        return {
          _id: item._id,
          name: item.name,
          caption: item.caption,
          tags: item.tags,
          collaborate: item.collaborate,
          images: global.buildUploadUrls(item.images),
          videos: global.buildUploadUrls(item.videos),
          thumbnail: item.thumbnail ? global.buildUploadUrls([item.thumbnail])?.[0] : null,
          location: item.location,

          hideLikes: item.hideLikes,
          hideComments: item.hideComments,
          turnOffComments: item.turnOffComments,
          followers_only: item.followers_only,

          tagged_users: (item.tagged_users || []).map(u => ({
            _id: u._id,
            name: u.full_name || u.name || u.username,
            username: u.username,
            profile_image: global.buildUserImageUrl(u.profile_image)
          })),

          createdAt: item.createdAt,
          createdBy,

          likesCount: item.likes ? item.likes.length : 0,
          commentsCount: item.comments ? item.comments.length : 0,

          // Lookbook flag
          isLookBook: lookbookPostIds.has(item._id.toString()),
        };
      });

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        list: finalList,
        total_records,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  likeUnlikePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user._id;
      console.log("[Notification] like/unlike request postId:", postId, "userId:", userId);

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return global.failResponse(res, "Invalid post ID", {});
      }

      const post = await posts.findById(postId).select("likes createdBy hideLikes");

      if (!post) {
        return global.failResponse(res, "Post not found", {});
      }

      const alreadyLiked = post.likes.some((id) => id.toString() === userId.toString());

      const updatedPost = await posts.findByIdAndUpdate(postId, alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } }, { new: true });

      if (!alreadyLiked) {
        const postWithOwner = await posts.findById(postId).select("createdBy").lean();
        const ownerId = postWithOwner?.createdBy;
        if (!ownerId) {
          console.log("[Notification] like post - no owner (createdBy), postId:", postId);
        } else if (ownerId.toString() === userId.toString()) {
          console.log("[Notification] like post - same user (own post), skip. postId:", postId);
        } else {
          const owner = await UserModel.findById(ownerId).select("fcm_token notification_settings").lean();
          const liker = await global.getUserData(userId);
          const likerName = liker?.first_name || liker?.name || "Someone";
          const title = "New like on your post";
          const body = `${likerName} liked your post`;
          const data = { type: NOTIFICATIONS_TYPES.POST_LIKE, postId: String(postId) };
          const allowPush = owner?.notification_settings?.push?.likes !== false;
          console.log("[Notification] Like settings check - ownerId:", ownerId, "likes_setting:", owner?.notification_settings?.push?.likes, "allowPush:", allowPush);

          if (allowPush) {
            try {
              const notifDoc = await Notifications.create({
                userId: ownerId,
                type: NOTIFICATIONS_TYPES.POST_LIKE,
                title,
                body,
                data: { postId: String(postId) },
                actorUserId: userId,
                read: false,
              });
              console.log("[Notification] saved to DB, id:", notifDoc._id, "userId:", ownerId, "postId:", postId);
            } catch (saveErr) {
              console.warn("[Notification] DB save failed:", saveErr?.message || saveErr);
            }

            if (owner?.fcm_token) {
              console.log("[Notification] sending FCM to owner:", ownerId, "postId:", postId);
              sendFCMToToken(owner.fcm_token, { title, body, data }).catch((e) => {
                console.warn("[Notification] FCM error:", e?.message || e);
              });
            } else {
              console.log("[Notification] FCM skip - owner has no fcm_token, ownerId:", ownerId);
            }
          } else {
            console.log("[Notification] Skip both DB and FCM - push disabled for likes, ownerId:", ownerId);
          }
        }
      }
      const isOwner =
        updatedPost.createdBy &&
        updatedPost.createdBy.toString() === userId.toString();
      const hideLikes = updatedPost.hideLikes && !isOwner;

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        likesCount: hideLikes ? null : updatedPost.likes.length,
        isLiked: !alreadyLiked,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  addComment: async (req, res) => {
    try {
      const { postId } = req.params;
      const { comment } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return global.failResponse(res, "Invalid post ID", {});
      }

      if (!comment || !comment.trim()) {
        return global.failResponse(res, "Comment is required", {});
      }

      const post = await posts.findById(postId).select("createdBy comments updatedBy turnOffComments");

      if (!post) {
        return global.failResponse(res, "Post not found", {});
      }

      if (post.turnOffComments) {
        return global.failResponse(res, "Comments are turned off for this post", {});
      }

      post.comments.push({
        userId,
        comment: comment.trim(),
      });

      post.updatedBy = userId;

      await post.save();

      // Notify post owner about new comment (skip if commenting on own post)
      const ownerId = post.createdBy;
      if (ownerId && ownerId.toString() !== userId.toString()) {
        const owner = await UserModel.findById(ownerId).select("fcm_token notification_settings").lean();
        const commenter = await global.getUserData(userId);
        const commenterName = commenter?.first_name || commenter?.name || "Someone";
        const title = "New comment on your post";
        const body = `${commenterName} commented on your post`;
        const newComment = post.comments[post.comments.length - 1];
        const data = {
          type: NOTIFICATIONS_TYPES.POST_COMMENT,
          postId: String(postId),
          commentId: newComment?._id ? String(newComment._id) : undefined,
        };
        const allowPush = owner?.notification_settings?.push?.comments !== false;
        console.log("[Notification] Comment settings check - ownerId:", ownerId, "comments_setting:", owner?.notification_settings?.push?.comments, "allowPush:", allowPush);

        if (allowPush) {
          try {
            await Notifications.create({
              userId: ownerId,
              type: NOTIFICATIONS_TYPES.POST_COMMENT,
              title,
              body,
              data: { postId: String(postId), ...(newComment?._id && { commentId: String(newComment._id) }) },
              actorUserId: userId,
              read: false,
            });
          } catch (saveErr) {
            console.warn("[Notification] comment DB save failed:", saveErr?.message || saveErr);
          }

          if (owner?.fcm_token) {
            sendFCMToToken(owner.fcm_token, { title, body, data }).catch((e) => {
              console.warn("[Notification] FCM comment error:", e?.message || e);
            });
          }
        } else {
          console.log("[Notification] Skip both DB and FCM - push disabled for comments, ownerId:", ownerId);
        }
      }

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        comments: post.comments,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  commentList: async (req, res) => {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 10 } = req.body;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return global.failResponse(res, "Invalid post ID", {});
      }

      const post = await posts
        .findById(postId)
        .select("comments createdBy hideComments")
        .populate({
          path: "comments.userId",
          select: "name email avatar username full_name profile_image",
        })
        .lean();

      if (!post) {
        return global.failResponse(res, "Post not found", {});
      }

      const viewerId = req.user._id;
      const isOwner =
        post.createdBy && post.createdBy.toString() === viewerId.toString();
      if (post.hideComments && !isOwner) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
          comments: [],
          total_records: 0,
          current_page: parseInt(page),
          total_pages: 0,
        });
      }

      // Sort comments by newest first (createdAt descending)
      const sortedComments = post.comments.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Calculate pagination
      const skip = (page - 1) * limit;
      const paginatedComments = sortedComments.slice(skip, skip + limit);

      // Format the comments with user details
      const formattedComments = paginatedComments.map((item) => {
        let user = item.userId;

        if (user) {
          user = {
            _id: user._id,
            name: user.name,
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            profile_image: global.buildUserImageUrl(user.profile_image),
          };
        }

        return {
          _id: item._id,
          comment: item.comment,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          user,
        };
      });

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        comments: formattedComments,
        total_records: sortedComments.length,
        current_page: parseInt(page),
        total_pages: Math.ceil(sortedComments.length / limit),
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  likeList: async (req, res) => {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 10 } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return global.failResponse(res, "Invalid post ID", {});
      }

      const post = await posts
        .findById(postId)
        .select("likes createdBy hideLikes")
        .populate({
          path: "likes",
          select: "name email avatar username full_name profile_image",
        })
        .lean();

      if (!post) {
        return global.failResponse(res, "Post not found", {});
      }

      const isOwner =
        post.createdBy && post.createdBy.toString() === userId.toString();
      if (post.hideLikes && !isOwner) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
          likes: [],
          total_records: 0,
          current_page: parseInt(page),
          total_pages: 0,
        });
      }

      // Get blocked users for current user
      const currentUser = await UserModel.findById(userId).select("blocked_users").lean();
      const blockedUsers = (currentUser?.blocked_users || []).map((id) => id.toString());

      // Filter out likes from blocked users (only in response, DB unchanged)
      const visibleLikes = (post.likes || []).filter(
        (user) => user && !blockedUsers.includes(user._id.toString()),
      );

      const totalLikes = visibleLikes.length;

      // Calculate pagination
      const skip = (page - 1) * limit;
      const paginatedLikes = visibleLikes.slice(skip, skip + limit);

      // Format the likes with user details
      const formattedLikes = paginatedLikes.map((user) => {
        if (user) {
          return {
            _id: user._id,
            name: user.name,
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            profile_image: global.buildUserImageUrl(user.profile_image),
          };
        }
        return null;
      }).filter(Boolean);

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        likes: formattedLikes,
        total_records: totalLikes,
        current_page: parseInt(page),
        total_pages: Math.ceil(totalLikes / limit),
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  allPosts: async (req, res) => {
    try {
      const userId = req.user._id;
      const currentUser = await UserModel.findById(userId).select("blocked_users").lean();
      const blockedUsers = currentUser?.blocked_users || [];
      const userObjectId = new ObjectId(userId);
      const sorting = { createdAt: -1 };

      // Get all post IDs that the logged-in user has reported
      const reportedPosts = await ReportedPosts.find({ user_id: userId }).select("post_id").lean();
      const reportedPostIds = reportedPosts
        .map(rp => rp.post_id)
        .filter(id => id && ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      async.parallel(
        {
          list: (callback) => {
            posts
              .aggregate([
                {
                  $match: {
                    _id: { $nin: reportedPostIds },
                    createdBy: { $nin: blockedUsers },
                  }
                },
                { $sort: sorting },
                {
                  $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          name: 1,
                          first_name: 1,
                          last_name: 1,
                          full_name: 1,
                          fullName: "$full_name",
                          username: 1,
                          profile_image: 1,
                          followers_users: 1,
                          privacy_settings: 1,
                        },
                      },
                    ],
                    as: "createdBy",
                  },
                },
                {
                  $addFields: {
                    creatorDoc: { $arrayElemAt: ["$createdBy", 0] },
                  },
                },
                {
                  $addFields: {
                    canViewPost: {
                      $or: [
                        { $eq: ["$creatorDoc._id", userObjectId] },
                        {
                          $and: [
                            {
                              $ne: [
                                { $ifNull: ["$creatorDoc.privacy_settings.only_me", false] },
                                true,
                              ],
                            },
                            {
                              $or: [
                                {
                                  $ne: [
                                    { $ifNull: ["$creatorDoc.privacy_settings.followers_only", false] },
                                    true,
                                  ],
                                },
                                {
                                  $in: [
                                    userObjectId,
                                    { $ifNull: ["$creatorDoc.followers_users", []] },
                                  ],
                                },
                              ],
                            },
                            {
                              $or: [
                                {
                                  $ne: [
                                    { $ifNull: ["$followers_only", false] },
                                    true,
                                  ],
                                },
                                {
                                  $in: [
                                    userObjectId,
                                    { $ifNull: ["$creatorDoc.followers_users", []] },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $match: {
                    canViewPost: true,
                  },
                },
                {
                  $lookup: {
                    from: "lookbooks",
                    localField: "_id",
                    foreignField: "post_id",
                    pipeline: [
                      {
                        $match: {
                          type: "post",
                          status: ACTIVE,
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          createdBy: 1,
                        },
                      },
                    ],
                    as: "lookbookEntries",
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    localField: "tagged_users",
                    foreignField: "_id",
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          name: 1,
                          full_name: 1,
                          username: 1,
                          profile_image: 1,
                        },
                      },
                    ],
                    as: "tagged_users_details",
                  },
                },
                {
                  $project: {
                    name: 1,
                    caption: 1,
                    collaborate: 1,
                    videos: 1,
                    images: 1,
                    tags: 1,
                    location: 1,
                    hideLikes: 1,
                    hideComments: 1,
                    turnOffComments: 1,
                    followers_only: 1,
                    likes: 1,
                    thumbnail: 1,
                    tagged_users: "$tagged_users_details",
                    likesCount: { $size: { $ifNull: ["$likes", []] } },
                    commentsCount: { $size: { $ifNull: ["$comments", []] } },
                    createdBy: {
                      $mergeObjects: [
                        {
                          _id: "$creatorDoc._id",
                          name: "$creatorDoc.name",
                          first_name: "$creatorDoc.first_name",
                          last_name: "$creatorDoc.last_name",
                          full_name: "$creatorDoc.full_name",
                          fullName: "$creatorDoc.fullName",
                          username: "$creatorDoc.username",
                          profile_image: "$creatorDoc.profile_image",
                        },
                      ],
                    },
                    // Lookbook users (who added this post)
                    lookbookBy: {
                      $map: {
                        input: { $ifNull: ["$lookbookEntries", []] },
                        as: "lb",
                        in: "$$lb.createdBy",
                      },
                    },
                    createdAt: 1,
                  },
                },
              ])
              .exec()
              .then((result) => {
                const processedResult = result.map((item) => {
                  // remove blocked users from likes list
                  const likesArray = (item.likes || []).filter(
                    (id) =>
                      id &&
                      !blockedUsers.some(
                        (bId) => bId && bId.toString() === id.toString(),
                      ),
                  );
                  const isLiked = likesArray.some(
                    (id) => id && id.toString() === userObjectId.toString(),
                  );

                  const lookbookBy = item.lookbookBy || [];
                  const isInLookbook = lookbookBy.some(
                    (id) => id && id.toString() === userObjectId.toString(),
                  );

                  const taggedUsersArray = (item.tagged_users || []).map(u => ({
                    ...u,
                    profile_image: global.buildUserImageUrl(u.profile_image)
                  }));

                  const creator = Array.isArray(item.createdBy)
                    ? item.createdBy[0]
                    : item.createdBy;

                  const processed = {
                    ...item,
                    images: global.buildUploadUrls(item.images),
                    videos: global.buildUploadUrls(item.videos),
                    thumbnail: item.thumbnail ? global.buildUploadUrls([item.thumbnail])?.[0] : null,
                    createdBy: creator
                      ? {
                        _id: creator._id,
                        name: creator.full_name || creator.name || creator.username,
                        first_name: creator.first_name,
                        last_name: creator.last_name,
                        full_name: creator.full_name,
                        fullName: creator.fullName || creator.full_name,
                        username: creator.username,
                        profile_image: global.buildUserImageUrl(creator.profile_image),
                      }
                      : null,
                    likedBy: likesArray,
                    isLiked,
                    likesCount: likesArray.length,
                    lookbookBy,
                    isInLookbook,
                    tagged_users: taggedUsersArray,
                  };
                  return global.applyPostHideFlags(processed, userId);
                });
                callback(null, processedResult);
              })
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            posts
              .countDocuments()
              .then((count) => callback(null, count))
              .catch((err) => callback(err));
          },
        },
        (err, result) => {
          if (err) {
            return global.failResponse(res, err.message, err);
          }
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
        },
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  delete: async (req, res) => {
    const { o_id } = req.query;
    const OutfitId = new ObjectId(o_id);

    try {
      await posts.deleteOne({
        _id: OutfitId,
        createdBy: req.user._id,
      });

      return global.successResponse(res, global.msg(req, res, "post_deleted_success"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  reportPost: async (req, res) => {
    try {
      const { post_id, reason } = req.body;
      const userId = req.user._id;

      if (!post_id || !ObjectId.isValid(post_id)) {
        return global.failResponse(res, "Invalid post ID. Post ID is required.", {});
      }

      if (!reason || !reason.trim()) {
        return global.failResponse(res, "Reason is required", {});
      }

      // Check if post exists
      const post = await posts.findById(post_id);
      if (!post) {
        return global.failResponse(res, "Post not found", {});
      }

      // Check if user already reported this post
      const existingReport = await ReportedPosts.findOne({
        user_id: userId,
        post_id: new ObjectId(post_id)
      });

      if (existingReport) {
        return global.failResponse(res, "You have already reported this post", {});
      }

      // Create report
      const reportData = {
        user_id: userId,
        post_id: new ObjectId(post_id),
        reason: reason.trim()
      };

      await ReportedPosts.create(reportData);

      // --- Send Admin Notification ---
      const reporter = await UserModel.findById(userId).select("first_name full_name email username").lean();
      const settings = await global.getGlobalSettings();
      console.log(settings.admin_email, "admin set=>>.");
      console.log(reporter, "reporter=>>.");

      if (reporter && settings && settings.admin_email) {
        const postName = post.name || `ID: ${post._id}`;
        const templateOptions = {
          slug: "report_post",
          dynamicStrings: {
            name: reporter.full_name || reporter.first_name || "User",
            email: reporter.email || "",
            user_name: reporter.username || "",
            reason: `${reason.trim()} (Post: ${postName})`,
          }
        };

        const template = await global.attachEmailTemplate(templateOptions);
        if (template && template.title) {
          global.sendEmail(template.subject, settings.admin_email, template.body);
        }
      }
      console.log("Post reported successfully");

      return global.successResponse(res, "Post reported successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default PostsController;
