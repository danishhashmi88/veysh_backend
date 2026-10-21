import mongoose from "mongoose";
import global from "../../../../../helpers/global-functions.js";
import Lookbook from "../../../../../models/lookbook.js";
import Posts from "../../../../../models/posts.js";
import Outfits from "../../../../../models/outfit.js";
import { ACTIVE, MESSAGE } from "../../../../../global-variable.js";
const ObjectId = mongoose.Types.ObjectId;

const MyLookbookController = {
  addLookbook: async (req, res) => {
    try {
      const { type, post_id, outfit_id, title, description, website_link, isLookbook, lookbook_id } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!type || !["post", "outfit", "website"].includes(type)) {
        return global.failResponse(res, "Type must be 'post', 'outfit', or 'website'", {});
      }

      const isAdd = isLookbook === true || isLookbook === "true";
      const isRemove = isLookbook === false || isLookbook === "false";

      if (!isAdd && !isRemove) {
        return global.failResponse(res, "isLookbook must be true or false", {});
      }

      // ───────────────────────────
      // REMOVE LOGIC
      // ───────────────────────────
      if (isRemove) {
        let removeQuery = { createdBy: userId, type };

        if (type === "post") {
          if (!post_id || !ObjectId.isValid(post_id)) {
            return global.failResponse(res, "Valid post ID is required", {});
          }
          removeQuery.post_id = post_id;

        } else if (type === "outfit") {
          if (!outfit_id || !ObjectId.isValid(outfit_id)) {
            return global.failResponse(res, "Valid outfit ID is required", {});
          }
          removeQuery.outfit_id = outfit_id;

        } else if (type === "website") {
          if (!lookbook_id || !ObjectId.isValid(lookbook_id)) {
            return global.failResponse(res, "Valid lookbook ID is required", {});
          }
          removeQuery._id = lookbook_id;
        }

        await Lookbook.findOneAndDelete(removeQuery);

        return global.successResponse(res, "Removed from lookbook successfully", {});
      }

      // ───────────────────────────
      // ADD LOGIC
      // ───────────────────────────
      let lookbookData = {
        type,
        createdBy: userId,
        isLookbook: true
      };

      if (type === "post") {
        if (!post_id || !ObjectId.isValid(post_id)) {
          return global.failResponse(res, "Valid post ID is required", {});
        }

        const post = await Posts.findOne({ _id: post_id });
        if (!post) {
          return global.failResponse(res, "Post not found", {});
        }

        const existing = await Lookbook.findOne({ createdBy: userId, post_id, type: "post", isLookbook: true });
        if (existing) {
          return global.failResponse(res, "Post already added to lookbook", {});
        }

        // Pehle se exist karta hai toh delete karke naya banao
        await Lookbook.findOneAndDelete({ createdBy: userId, post_id, type: "post" });

        lookbookData.post_id = post_id;

      } else if (type === "outfit") {
        if (!outfit_id || !ObjectId.isValid(outfit_id)) {
          return global.failResponse(res, "Valid outfit ID is required", {});
        }

        const outfit = await Outfits.findOne({ _id: outfit_id, status: ACTIVE });
        if (!outfit) {
          return global.failResponse(res, "Outfit not found", {});
        }

        const existing = await Lookbook.findOne({ createdBy: userId, outfit_id, type: "outfit", isLookbook: true });
        if (existing) {
          return global.failResponse(res, "Outfit already added to lookbook", {});
        }

        // Pehle se exist karta hai toh delete karke naya banao
        await Lookbook.findOneAndDelete({ createdBy: userId, outfit_id, type: "outfit" });

        lookbookData.outfit_id = outfit_id;

      } else if (type === "website") {
        if (!title || !title.trim()) {
          return global.failResponse(res, "Title is required", {});
        }
        if (!website_link || !website_link.trim()) {
          return global.failResponse(res, "Website link is required", {});
        }

        try {
          new URL(website_link);
        } catch (e) {
          return global.failResponse(res, "Invalid website link format", {});
        }

        const imageName = await global.uploadFile(req, "image", "lookbook");
        if (imageName) lookbookData.image = imageName;

        lookbookData.title = title.trim();
        lookbookData.description = description ? description.trim() : null;
        lookbookData.website_link = website_link.trim();
      }

      const lookbookItem = await Lookbook.create(lookbookData);

      return global.successResponse(res, "Added to lookbook successfully", {
        lookbook_item: lookbookItem,
      });

    } catch (err) {
      return global.failResponse(res, err.message || "Something went wrong", {});
    }
  },

  getLookbook: async (req, res) => {
    try {
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      const matchQuery = {
        createdBy: new ObjectId(userId),
        status: ACTIVE,
        isLookbook: true,
      };

      const lookbookItems = await Lookbook.aggregate([
        {
          $match: matchQuery,
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "postDetails",
          },
        },
        {
          $lookup: {
            from: "outfits",
            localField: "outfit_id",
            foreignField: "_id",
            as: "outfitDetails",
          },
        },
        {
          $project: {
            type: 1,
            title: 1,
            description: 1,
            website_link: 1,
            image: 1,
            createdAt: 1,
            updatedAt: 1,
            post: {
              $cond: {
                if: { $eq: ["$type", "post"] },
                then: { $arrayElemAt: ["$postDetails", 0] },
                else: null,
              },
            },
            outfit: {
              $cond: {
                if: { $eq: ["$type", "outfit"] },
                then: { $arrayElemAt: ["$outfitDetails", 0] },
                else: null,
              },
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      const processedItems = lookbookItems.map((item) => {
        const processedItem = {
          _id: item._id,
          type: item.type,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };

        if (item.type === "post" && item.post) {
          processedItem.post = {
            ...item.post,
            images: global.buildUploadUrls(item.post.images || []),
            videos: global.buildUploadUrls(item.post.videos || []),
            thumbnail: item.post.thumbnail ? global.buildUploadUrls([item.post.thumbnail])[0] ?? null : null,
          };
        } else if (item.type === "outfit" && item.outfit) {
          processedItem.outfit = {
            ...item.outfit,
            images: global.buildUploadUrls(item.outfit.images || []),
          };
        } else if (item.type === "website") {
          processedItem.title = item.title;
          processedItem.description = item.description;
          processedItem.website_link = item.website_link;
          processedItem.image = item.image ? global.buildLookbookImageUrl(item.image) : null;
        }

        return processedItem;
      });

      return global.successResponse(res, "Lookbook fetched successfully", {
        items: processedItems,
        total_count: processedItems.length,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  deleteLookbookItem: async (req, res) => {
    try {
      const { lookbook_id } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!lookbook_id || !ObjectId.isValid(lookbook_id)) {
        return global.failResponse(res, "Valid lookbook ID is required", {});
      }

      const lookbookItem = await Lookbook.findOne({
        _id: lookbook_id,
        createdBy: userId,
      });

      if (!lookbookItem) {
        return global.failResponse(res, "Lookbook item not found", {});
      }

      await Lookbook.findByIdAndDelete(lookbook_id);

      return global.successResponse(res, "Lookbook item deleted successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default MyLookbookController;
