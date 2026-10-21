import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { MESSAGE, ACTIVE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
import axios from "axios";
// models
import outfits from "../../../../../models/outfit.js";
import Posts from "../../../../../models/posts.js";
import items from "../../../../../models/items.js";
import Category from "../../../../../models/category.js";
import SubCategory from "../../../../../models/subCategory.js";
import Lookbook from "../../../../../models/lookbook.js";
import WardrobeChats from "../../../../../models/wardrobe-chats.js";
import userSubscription from "../../../../../models/user-subscription.js";
import subscriptionHelper from "../../../../../helpers/subscription-helper.js";
import RentPurchase from "../../../../../models/rent-purchase.js";

import { PER_PAGE_RECORDS } from "../../../../../global-variable.js";
import Users from "../../../../../models/users.js";
import GlobalFunctions from "../../../../../helpers/global-functions.js";

const buildRentImagesFromOutfit = (outfitImages = []) => {
  const images = Array.isArray(outfitImages) ? outfitImages : outfitImages ? [outfitImages] : [];
  return images.filter(Boolean).map((img) => {
    if (typeof img === "string" && (img.startsWith("uploads/") || img.startsWith("http://") || img.startsWith("https://"))) {
      return img;
    }
    return `uploads/outfits/${img}`;
  });
};

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return JSON.parse(trimmed);
  }
  return value;
};

const normalizeToObjectIdArray = (value) => {
  const parsed = parseMaybeJson(value);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
};

const OutfitController = {
  save: async (req, res) => {
    try {
      const { name, category, suitable, status, occasion, notes, tags, description, item_id, purchase_rent_price, purchase_rent_toggle } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      // Check subscription limit
      const limitCheck = await subscriptionHelper.checkLimit(userId, "outfit");
      if (limitCheck.limitReached) {
        return global.successResponse(res, limitCheck.message, {
          limit_reached: true,
          limit: limitCheck.limit,
          current_usage: limitCheck.currentUsage
        });
      }

      //  if (!ObjectId.isValid(item_id)) {
      //    return global.failResponse(res, "Invalid item ID", {});
      //  }
      const formattedTitle = global.capitalizeFirstLetter(name.trim());

      const existingItem = await outfits.findOne({
        name: formattedTitle,
        createdBy: userId,
      });

      if (existingItem) {
        return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
      }

      const normalizedCategories = normalizeToObjectIdArray(category);
      const normalizedItemIds = normalizeToObjectIdArray(item_id);
      if (!normalizedItemIds.length) {
        return global.failResponse(res, "Invalid item_id", {});
      }
      if (!normalizedCategories.length) {
        return global.failResponse(res, "Invalid category", {});
      }

      let itemData = {
        name: global.capitalizeFirstLetter(name),
        category: normalizedCategories,
        occasion,
        description,
        notes,
        tags,
        status,
        suitable,
        purchase_rent_toggle,
        purchase_rent_price: purchase_rent_toggle ? purchase_rent_price : null,
        user_id: userId,
        createdBy: userId,
        updatedBy: userId,
        item_id: normalizedItemIds,
      };



      if (Array.isArray(occasion)) {
        itemData.occasion = occasion.length ? occasion[0] : undefined;
      } else if (typeof occasion === "string") {
        itemData.occasion = occasion;
      }

      if (Array.isArray(suitable)) {
        itemData.suitable = suitable.length ? suitable[0] : undefined;
      } else if (typeof suitable === "string") {
        itemData.suitable = suitable;
      }


      if (tags !== undefined) {
        itemData.tags = parseMaybeJson(tags);
      }

      if (notes !== undefined) itemData.notes = notes;
      if (status !== undefined) itemData.status = status;

      if (description !== undefined) itemData.description = description;

      if (purchase_rent_toggle !== undefined) itemData.purchase_rent_toggle = purchase_rent_toggle;

      if (purchase_rent_price !== undefined) itemData.purchase_rent_price = purchase_rent_price;

      const images = await global.uploadFile(req, "images", "outfits");
      if (images) {
        itemData.images = `uploads/outfits/${images}`;
      }
      const newItem = await outfits.create(itemData);

      if (newItem.purchase_rent_toggle === true) {
        await RentPurchase.create({
          item_id: null,
          outfit_id: newItem._id,
          purchase_rent_toggle: true,
          purchase_rent_price: newItem.purchase_rent_price ?? null,
          images: null,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      return global.successResponse(res, global.msgByReq(req, "outfit_added_success"), { outfit: newItem });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  shareOnFeed: async (req, res) => {
    try {
      const { outfitId } = req.params;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(outfitId)) {
        return global.failResponse(res, "Invalid outfit ID", {});
      }

      const outfit = await outfits.findOne({
        _id: outfitId,
        createdBy: userId,
      });


      if (!outfit) {
        return global.failResponse(res, "Outfit not found", {});
      }

      if (outfit.is_shared === true) {
        return global.failResponse(res, "Outfit already shared to feed", {});
      }

      const postData = {
        name: outfit.name,
        caption: outfit.description || "",
        tags: outfit.tags || [],
        collaborate: false,
        images: Array.isArray(outfit.images) ? outfit.images : outfit.images ? [outfit.images] : [],
        videos: [],
        collection_id: outfit._id,
        createdBy: userId,
        updatedBy: userId,
      };

      const post = await Posts.create(postData);

      outfit.is_shared = true;
      await outfit.save();

      return global.successResponse(res, "Outfit shared to feed successfully", {
        outfit_id: outfit._id,
        post,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  details: (req, res) => {
    const { o_id } = req.query;

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid item ID", {});
    }

    outfits
      .aggregate([
        { $match: { _id: new ObjectId(o_id) } },

        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },

        {
          $lookup: {
            from: "items",
            let: { itemIds: "$item_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$_id", "$$itemIds"] },
                },
              },
              {
                $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "category",
                },
              },
              {
                $lookup: {
                  from: "subcategories",
                  localField: "sub_category",
                  foreignField: "_id",
                  as: "sub_category",
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  brand_name: 1,
                  price: 1,
                  occasion: 1,
                  season: 1,
                  colors: 1,
                  fabric: 1,
                  size: 1,
                  images: 1,
                  statuses: 1,
                  notes: 1,
                  tags: 1,
                  mood: 1,
                  care: 1,
                  wear_count: 1,
                  measurements: 1,
                  purchase_rent_toggle: 1,
                  purchase_rent_price: 1,
                  category: 1,
                  sub_category: { $arrayElemAt: ["$sub_category", 0] },
                },
              },
            ],
            as: "items",
          },
        },

        {
          $lookup: {
            from: "subcategories",
            localField: "sub_category",
            foreignField: "_id",
            as: "sub_category",
          },
        },

        {
          $lookup: {
            from: "lookbooks",
            localField: "_id",
            foreignField: "outfit_id",
            pipeline: [
              {
                $match: {
                  type: "outfit",
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

        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),

        {
          $project: {
            name: 1,
            description: 1,
            suitable: 1,
            occasion: 1,
            status: 1,
            notes: 1,
            tags: 1,
            images: 1,
            items: 1,

            category: 1,
            sub_category: { $arrayElemAt: ["$sub_category", 0] },

            lookbookBy: {
              $map: {
                input: { $ifNull: ["$lookbookEntries", []] },
                as: "lb",
                in: "$$lb.createdBy",
              },
            },

            purchase_rent_price: 1,
            purchase_rent_toggle: 1,

            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ])
      .exec()
      .then((result) => {
        const item = result[0] || {};
        if (!item._id) return global.failResponse(res, "Outfit not found", {});

        const userObjectId = new ObjectId(req.user._id);
        const owner = item.createdBy || {};
        const viewerId = userObjectId.toString();
        const isOwner = viewerId === owner._id?.toString();
        const isFollower = owner.followers_users?.some(
          (id) => id.toString() === viewerId
        );
        const settings = owner.privacy_settings || {
          only_me: false,
          followers_only: false,
        };

        if (!isOwner) {
          if (settings.only_me) {
            return global.failResponse(res, "This outfit is private", {});
          } else if (settings.followers_only && !isFollower) {
            return global.failResponse(
              res,
              "This outfit is for followers only",
              {}
            );
          }
        }

        const lookbookBy = item.lookbookBy || [];
        item.isLookbok = lookbookBy.some(
          (id) => id && id.toString() === userObjectId.toString()
        );

        // Outfit images
        if (item.images) {
          item.images = global.buildUploadUrls(item.images);
        }

        // Items images
        if (item.items && item.items.length > 0) {
          item.items = item.items.map((i) => ({
            ...i,
            images: i.images ? global.buildUploadUrls(i.images) : [],
          }));
        }

        return global.successResponse(res, MESSAGE.OPR_SUCCESS, item);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },
  edit: async (req, res) => {
    const { o_id, name, category, sub_category, status, suitable, occasion, notes, tags, description, purchase_rent_price, purchase_rent_toggle } = req.body;
    const userId = req.user._id;

    if (!ObjectId.isValid(userId)) {
      return global.failResponse(res, "Invalid user ID", {});
    }

    const formattedTitle = global.capitalizeFirstLetter(name.trim());

    const existingItem = await outfits.findOne({
      name: formattedTitle,
      createdBy: userId,
      _id: { $ne: new ObjectId(o_id) },
    });


    if (existingItem) {
      return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
    }

    const normalizedCategories = normalizeToObjectIdArray(category);
    if (!normalizedCategories.length) {
      return global.failResponse(res, "Invalid category", {});
    }

    let updateData = {
      name: global.capitalizeFirstLetter(name),
      category: normalizedCategories,
      sub_category,
      occasion,
      description,
      status,
      notes,
      tags,
      suitable,
      purchase_rent_toggle,
      purchase_rent_price: purchase_rent_toggle ? purchase_rent_price : null,
      updatedBy: userId,
    };

    if (occasion !== undefined) updateData.occasion = occasion;

    if (tags !== undefined) {
      const parsedTags = parseMaybeJson(tags);
      updateData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags].filter(Boolean);
    }

    if (notes !== undefined) updateData.notes = notes;

    if (status !== undefined) updateData.status = notes;
    if (description !== undefined) updateData.description = description;

    if (purchase_rent_toggle !== undefined) {
      updateData.purchase_rent_toggle = purchase_rent_toggle;

      if (purchase_rent_toggle) {
        if (purchase_rent_price !== undefined) {
          updateData.purchase_rent_price = purchase_rent_price;
        }
      } else {
        updateData.purchase_rent_price = null;
      }
    }

    const images = await global.uploadFile(req, "images", "outfits");
    if (images) {
      updateData.images = Array.isArray(images) ? images.map((img) => `uploads/outfits/${img}`) : [`uploads/outfits/${images}`];
    }

    outfits
      .updateOne({ _id: new ObjectId(o_id), createdBy: userId }, { $set: updateData }, { new: true })
      .then(async (result) => {
        const updatedOutfit = await outfits.findOne({ _id: new ObjectId(o_id), createdBy: userId });
        if (updatedOutfit && updatedOutfit.purchase_rent_toggle === true) {
          await RentPurchase.findOneAndUpdate(
            { outfit_id: updatedOutfit._id },
            {
              $set: {
                item_id: null,
                purchase_rent_toggle: true,
                purchase_rent_price: updatedOutfit.purchase_rent_price ?? null,
                images: null,
                updatedBy: userId,
              },
              $setOnInsert: {
                createdBy: userId,
              },
            },
            { upsert: true, new: true },
          );
        } else if (updatedOutfit) {
          await RentPurchase.deleteOne({ outfit_id: updatedOutfit._id });
        }
        return global.successResponse(res, global.msg(req, res, "outfit_updated_success"), result);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  enableRentByOutfitId: async (req, res) => {
    try {
      const { o_id, purchase_rent_price } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid outfit ID", {});
      }

      const existingOutfit = await outfits.findOne({
        _id: new ObjectId(o_id),
        createdBy: new ObjectId(userId),
      });

      if (!existingOutfit) {
        return global.failResponse(res, "Outfit not found", {});
      }

      if (existingOutfit.purchase_rent_toggle === true) {
        return global.failResponse(res, "Purchase/Rent toggle is already ON for this outfit", {});
      }

      existingOutfit.purchase_rent_toggle = true;
      existingOutfit.purchase_rent_price = purchase_rent_price ?? null;
      existingOutfit.updatedBy = userId;
      await existingOutfit.save();

      const uploadedImages = await global.uploadFile(req, "images", "rentPurachase");
      const rentImages = uploadedImages
        ? (Array.isArray(uploadedImages)
          ? uploadedImages.map((img) => `uploads/rentPurachase/${img}`)
          : [`uploads/rentPurachase/${uploadedImages}`])
        : [];

      const rentPurchaseRecord = await RentPurchase.create({
        item_id: null,
        outfit_id: existingOutfit._id,
        purchase_rent_toggle: true,
        purchase_rent_price: purchase_rent_price ?? null,
        images: rentImages,
        createdBy: userId,
        updatedBy: userId,
      });

      return global.successResponse(res, "Purchase/Rent enabled successfully", {
        outfit: existingOutfit,
        rent_purchase: rentPurchaseRecord,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  list: async (req, res) => {
    const globalSearch = ["name"];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    const userObjectId = new ObjectId(req.user._id);

    let json = {
      createdBy: new ObjectId(req.user._id),
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };


    let sorting = await global.getSorting(req);

    async.parallel(
      {
        list: (callback) => {
          outfits
            .aggregate([
              { $match: json },
              { $sort: sorting },
              { $skip: skip },
              { $limit: perPage },

              {
                $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "category",
                },
              },
              {
                $lookup: {
                  from: "subcategories",
                  localField: "sub_category",
                  foreignField: "_id",
                  as: "sub_category",
                },
              },
              {
                $lookup: {
                  from: "items",
                  let: { itemId: "$item_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$itemId"] },
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                      },
                    },
                  ],
                  as: "item",
                },
              },
              {
                $lookup: {
                  from: "lookbooks",
                  localField: "_id",
                  foreignField: "outfit_id",
                  pipeline: [
                    {
                      $match: {
                        type: "outfit",
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
                $project: {
                  name: 1,
                  description: 1,
                  suitable: 1,
                  occasion: 1,
                  status: 1,
                  notes: 1,
                  tags: 1,
                  images: { $slice: ["$images", 1] },
                  purchase_rent_price: 1,
                  purchase_rent_toggle: 1,
                  createdAt: 1,
                  createdBy: 1,
                  item: { $arrayElemAt: ["$item", 0] },
                  category: 1,
                  sub_category: { $arrayElemAt: ["$sub_category", 0] },
                  // users who added this outfit to lookbook
                  lookbookBy: {
                    $map: {
                      input: { $ifNull: ["$lookbookEntries", []] },
                      as: "lb",
                      in: "$$lb.createdBy",
                    },
                  },
                },
              },
            ])
            .exec()
            .then((result) => {
              const processedResult = result.map((item) => {
                const lookbookBy = item.lookbookBy || [];
                const isInLookbook = lookbookBy.some(
                  (id) => id && id.toString() === userObjectId.toString(),
                );

                return {
                  ...item,
                  images: global.buildUploadUrls(item.images),
                  lookbookBy,
                  isInLookbook,
                };
              });
              callback(null, processedResult);
            })
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          outfits
            .countDocuments(json)
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
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      },
    );
  },
  list2: async (req, res) => {
    try {
      const globalSearch = ["name"];

      const userObjectId = new ObjectId(req.user._id);

      const json = {
        ...global.getSearching(req, globalSearch),
        ...global.getFilter(req),
      };

      const sorting = await global.getSorting(req);

      async.parallel(
        {
          list: (callback) => {
            outfits
              .aggregate([
                { $match: json },
                { $sort: sorting },

                {
                  $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "category",
                  },
                },
                {
                  $lookup: {
                    from: "subcategories",
                    localField: "sub_category",
                    foreignField: "_id",
                    as: "sub_category",
                  },
                },
                {
                  $lookup: {
                    from: "items",
                    let: { itemId: "$item_id" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$itemId"] },
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          name: 1,
                        },
                      },
                    ],
                    as: "item",
                  },
                },
                {
                  $lookup: {
                    from: "lookbooks",
                    localField: "_id",
                    foreignField: "outfit_id",
                    pipeline: [
                      {
                        $match: {
                          type: "outfit",
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
                  $project: {
                    name: 1,
                    description: 1,
                    suitable: 1,
                    occasion: 1,
                    status: 1,
                    notes: 1,
                    tags: 1,
                    images: { $slice: ["$images", 1] },
                    createdAt: 1,
                    item: { $arrayElemAt: ["$item", 0] },
                    category: 1,
                    sub_category: { $arrayElemAt: ["$sub_category", 0] },
                    // users who added this outfit to lookbook
                    lookbookBy: {
                      $map: {
                        input: { $ifNull: ["$lookbookEntries", []] },
                        as: "lb",
                        in: "$$lb.createdBy",
                      },
                    },
                  },
                },
              ])
              .exec()
              .then((result) => {
                const processedResult = result.map((item) => {
                  const lookbookBy = item.lookbookBy || [];
                  const isInLookbook = lookbookBy.some(
                    (id) => id && id.toString() === userObjectId.toString(),
                  );

                  return {
                    ...item,
                    images: global.buildUploadUrls(item.images),
                    lookbookBy,
                    isInLookbook,
                  };
                });
                callback(null, processedResult);
              })
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            outfits
              .countDocuments(json)
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
      await outfits.deleteOne({
        _id: OutfitId,
        createdBy: req.user._id,
      });

      return global.successResponse(res, global.msg(req, res, "outfit_deleted_success"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  // saveSuggested: async (req, res) => {
  //   try {
  //     const { name, category_id, item_ids, occasion, description } = req.body;
  //     const userId = req.user._id;

  //     if (!name || !category_id || !item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
  //       return global.failResponse(res, "Invalid input data", {});
  //     }

  //     const formattedTitle = global.capitalizeFirstLetter(name.trim());
  //     const existingItem = await outfits.findOne({
  //       name: formattedTitle,
  //       createdBy: userId,
  //     });

  //     if (existingItem) {
  //       return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
  //     }

  //     // Fetch items to get images and verify ownership
  //     const userItems = await items.find({
  //       _id: { $in: item_ids },
  //       createdBy: userId,
  //       status: ACTIVE
  //     }).select("images");

  //     if (userItems.length === 0) {
  //       return global.failResponse(res, "No valid items found to create outfit", {});
  //     }

  //     // Collect first image from each item
  //     const buildItemImageUrl = (rawImage) => {
  //       if (!rawImage) return null;
  //       const cleanPath = rawImage.startsWith("uploads/items/")
  //         ? rawImage
  //         : `uploads/items/${rawImage}`;
  //       return global.buildUploadUrls([cleanPath])?.[0] || null;
  //     };
  //     const outfitImages = userItems
  //       .map(item => (item.images && item.images.length > 0) ? buildItemImageUrl(item.images[0]) : null)
  //       .filter(Boolean);

  //     const itemData = {
  //       name: formattedTitle,
  //       category: category_id,
  //       item_id: item_ids,
  //       occasion: occasion || null,
  //       description: description || "",
  //       images: outfitImages,
  //       status: ACTIVE,
  //       createdBy: userId,
  //       updatedBy: userId,
  //     };

  //     const newItem = await outfits.create(itemData);
  //     return global.successResponse(res, global.msgByReq(req, "outfit_added_success"), { outfit: newItem });

  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },

  saveSuggested: async (req, res) => {
    try {
      const { name, category_id, item_ids, occasion, description } = req.body;
      const userId = req.user._id;
      const ACTIVE = 1;

      if (!name || !category_id || !item_ids) {
        return global.failResponse(res, "Invalid input data", {});
      }

      const formattedTitle = global.capitalizeFirstLetter(name.trim());
      const existingItem = await outfits.findOne({
        name: formattedTitle,
        createdBy: userId,
      });

      if (existingItem) {
        return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
      }

      const normalizedCategories = normalizeToObjectIdArray(category_id);
      const normalizedItemIds = normalizeToObjectIdArray(item_ids);
      if (!normalizedItemIds.length) {
        return global.failResponse(res, "Invalid item_ids", {});
      }
      if (!normalizedCategories.length) {
        return global.failResponse(res, "Invalid category_id", {});
      }

      let itemData = {
        name: formattedTitle,
        category: normalizedCategories,
        item_id: normalizedItemIds,
        occasion: occasion || null,
        description: description || "",
        status: ACTIVE,
        createdBy: userId,
        updatedBy: userId,
      };

      // --- IMAGE SAVING LOGIC (Same as save function) ---
      // Yahan hum items ki images nahi utha rahe, balki req se file upload kar rahe hain
      const images = await global.uploadFile(req, "images", "outfits");
      if (images) {
        itemData.images = `uploads/outfits/${images}`;
      }
      // --------------------------------------------------

      const newItem = await outfits.create(itemData);
      return global.successResponse(res, global.msgByReq(req, "outfit_added_success"), { outfit: newItem });

    } catch (err) {
      console.error("Save Suggested Error:", err);
      return global.failResponse(res, err.message, err);
    }
  },


  // askWardrobeQuestion: async (req, res) => {
  //   try {
  //     const { question } = req.body;
  //     const userId = req.user._id;

  //     if (!question || !question.trim()) {
  //       return global.failResponse(res, "Question is required", {});
  //     }

  //     const greetings = ['hello', 'hi', 'hey', 'hii', 'helo', 'namaste', 'hola', 'sup', 'yo'];
  //     if (greetings.includes(question.trim().toLowerCase())) {
  //       const greetingResponse = {
  //         answer: "Hey! I'm your personal stylist. What can I help you with today?\n\nYou can ask me things like:\n• 'What should I wear to a party tonight?'\n• 'Suggest a casual outfit for tomorrow'\n• 'What goes with my red dress?'",
  //         suggested_outfits: [],
  //         suggested_new_outfits: [],
  //         missing_items: []
  //       };

  //       await WardrobeChats.create({
  //         user_id: userId,
  //         question: question.trim(),
  //         response: greetingResponse,
  //         is_greeting: true
  //       });

  //       return global.successResponse(res, "Answered successfully", greetingResponse);
  //     }

  //     const [userItems, userOutfits] = await Promise.all([
  //       items.find({ createdBy: userId, status: ACTIVE })
  //         .limit(8)
  //         .select("name category colors"),
  //       outfits.find({ createdBy: userId, status: ACTIVE })
  //         .limit(4)
  //         .select("name occasion"),
  //     ]);

  //     const closetContext = {
  //       items: userItems.map(item => ({
  //         id: item._id,
  //         name: item.name,
  //         category: item.category,
  //         colors: item.colors
  //       })),
  //       outfits: userOutfits.map(outfit => ({
  //         id: outfit._id,
  //         name: outfit.name,
  //         occasion: outfit.occasion,
  //         suitable_weather: outfit.suitable,
  //       })),
  //     };

  //     const prompt = `
  // You are a friendly fashion stylist.

  // USER CLOSET:
  // ${JSON.stringify(closetContext)}

  // RULES:
  // - Always suggest outfits using available items.
  // - Each outfit must have items.
  // - Match occasion if possible, but be flexible.
  // - Avoid pairing heavy fabrics together.
  // - Use simple, practical styling advice.

  // TONE:
  // - Friendly, short (2–4 lines)
  // - No outfit names in answer
  // - Ask 1 follow-up question

  // OUTPUT FORMAT (STRICT JSON):
  // {
  //   "answer": "",
  //   "suggested_outfit_ids": [],
  //   "suggested_new_outfits": [
  //     {
  //       "name": "",
  //       "item_ids": [],
  //       "category_id": "",
  //       "description": ""
  //     }
  //   ],
  // }

  // USER QUESTION: "${question.trim()}"
  // `;

  //     const openaiRes = await axios.post(
  //       process.env.OPENAI_URL,
  //       {
  //         model: process.env.OPENAI_MODEL,
  //         messages: [
  //           {
  //             role: "system",
  //             content: "You are a friendly personal fashion stylist. Always reply in JSON only. Be warm, fun, and conversational in the answer field. Never list outfit names in the answer — just give vibe and suggestions through words."
  //           },
  //           { role: "user", content: prompt }
  //         ],
  //         response_format: { type: "json_object" }
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );

  //     const rawResponse = openaiRes.data.choices[0].message.content;
  //     const structuredResponse = JSON.parse(rawResponse);

  //     const suggestedOutfitIds = structuredResponse.suggested_outfit_ids || [];
  //     const existingOutfits = await outfits.find({ _id: { $in: suggestedOutfitIds } });

  //     const allItemIds = (structuredResponse.suggested_new_outfits || [])
  //       .flatMap(out => out.item_ids);

  //     const populatedItems = await items.find({ _id: { $in: allItemIds } })
  //       .select("name category colors fabric season occasion tags images");

  //     const itemMap = {};
  //     populatedItems.forEach(i => { itemMap[i._id.toString()] = i; });

  //     const buildItemImageUrl = (rawImage) => {
  //       if (!rawImage) return null;
  //       const cleanPath = rawImage.startsWith("uploads/items/")
  //         ? rawImage
  //         : `uploads/items/${rawImage}`;
  //       return global.buildUploadUrls([cleanPath])?.[0] || null;
  //     };

  //     // ✅ Updated logic to handle Collage Generation
  //     const newOutfitSuggestions = await Promise.all((structuredResponse.suggested_new_outfits || []).map(async (out) => {
  //       const validItemIds = out.item_ids.filter(id => itemMap[id.toString()]);
  //       const outfitItems = validItemIds.map(id => itemMap[id.toString()]);

  //       // Collage ke liye images (har item ki pehli image)
  //       const imagesForCollage = outfitItems
  //         .map(item => buildItemImageUrl((item.images || [])[0]))
  //         .filter(Boolean);

  //       // Individual item details with all their images
  //       const itemsDetail = outfitItems.map(item => ({
  //         _id: item._id,
  //         name: item.name,
  //         category: item.category,
  //         images: (item.images || []).map(buildItemImageUrl).filter(Boolean)
  //       }));

  //       // --- NAYA COLLAGE LOGIC START ---
  //       let outfit_image = "";
  //       try {
  //         // GlobalFunctions mein jo createOutfitCollage banaya hai use call kiya
  //         const collageFile = await GlobalFunctions.createOutfitCollage(imagesForCollage);
  //         if (collageFile) {
  //           outfit_image = `${process.env.BASE_URL}/uploads/items/${collageFile}`;
  //         } else {
  //           outfit_image = imagesForCollage[0] || ""; // Fallback to first item image
  //         }
  //       } catch (collageErr) {
  //         console.error("Collage Generation Error:", collageErr);
  //         outfit_image = imagesForCollage[0] || "";
  //       }
  //       // --- NAYA COLLAGE LOGIC END ---

  //       return {
  //         name: out.name,
  //         category_id: out.category_id,
  //         item_ids: out.item_ids,
  //         description: out.description, // Purani functionality intact
  //         items: itemsDetail,
  //         images: imagesForCollage,
  //         outfit_image: outfit_image, // Nayi generated collage image
  //         is_saved: false
  //       };
  //     }));

  //     const finalResponse = {
  //       answer: structuredResponse.answer || "",
  //       suggested_outfits: existingOutfits.map(outfit => ({
  //         ...outfit._doc,
  //         images: global.buildUploadUrls(outfit.images || []),
  //         outfit_image: global.buildUploadUrls(outfit.images || [])[0], // DB outfits ke liye default
  //         is_saved: true
  //       })),
  //       suggested_new_outfits: newOutfitSuggestions,
  //     };

  //     await WardrobeChats.create({
  //       user_id: userId,
  //       question: question.trim(),
  //       response: finalResponse,
  //       is_greeting: false
  //     });

  //     return global.successResponse(res, "Answered successfully", finalResponse);

  //   } catch (err) {
  //     console.error("OpenAI API Error:", err.response?.data || err.message);
  //     return global.failResponse(res, err.message || "Failed to answer question", {});
  //   }
  // },

  //   askWardrobeQuestion: async (req, res) => {
  //     try {
  //       const { question } = req.body;
  //       const userId = req.user._id;
  //       const ACTIVE = 1;

  //       if (!question || !question.trim()) {
  //         return global.failResponse(res, "Question is required", {});
  //       }

  //       // --- NAYA LOGIC: USER KA GENDER FETCH KARNA ---
  //       // Maan ke chal raha hoon ki req.user mein data hai, ya fir User model se nikal rahe hain
  //       const userData = await Users.findById(userId).select("gender");
  //       const userGender = userData?.gender || "not specified";
  //       // ----------------------------------------------

  //       const greetings = ['hello', 'hi', 'hey', 'hii', 'helo', 'namaste', 'hola', 'sup', 'yo'];
  //       if (greetings.includes(question.trim().toLowerCase())) {
  //         const greetingResponse = {
  //           answer: "Hey! I'm your personal stylist. What can I help you with today?\n\nYou can ask me things like:\n• 'What should I wear to a party tonight?'\n• 'Suggest a casual outfit for tomorrow'\n• 'What goes with my red dress?'",
  //           suggested_outfits: [],
  //           suggested_new_outfits: [],
  //           missing_items: []
  //         };

  //         await WardrobeChats.create({
  //           user_id: userId,
  //           question: question.trim(),
  //           response: greetingResponse,
  //           is_greeting: true
  //         });

  //         return global.successResponse(res, "Answered successfully", greetingResponse);
  //       }

  //       // Closet aur Outfits fetch karte waqt saara data nikalna behtar hai precision ke liye
  //       const [userItems, userOutfits] = await Promise.all([
  //         items.find({ createdBy: userId, status: ACTIVE })
  //           .limit(15) // Limit thodi badha di taaki AI ko zyada options milein
  //           .select("name category colors"),
  //         outfits.find({ createdBy: userId, status: ACTIVE })
  //           .limit(5)
  //           .select("name occasion"),
  //       ]);

  //       const closetContext = {
  //         user_gender: userGender, // Gender yahan add kiya
  //         items: userItems.map(item => ({
  //           id: item._id,
  //           name: item.name,
  //           category: item.category,
  //           colors: item.colors
  //         })),
  //         outfits: userOutfits.map(outfit => ({
  //           id: outfit._id,
  //           name: outfit.name,
  //           occasion: outfit.occasion
  //         })),
  //       };

  //       const prompt = `
  // You are a friendly fashion stylist.

  // USER PROFILE:
  // - Gender: ${userGender} (Strictly suggest outfits appropriate for this gender)

  // USER CLOSET:
  // ${JSON.stringify(closetContext)}

  // RULES:
  // - Always suggest outfits using available items.
  // - Ensure the style matches a ${userGender} person.
  // - Each outfit must have items.
  // - Match occasion if possible, but be flexible.
  // - Avoid pairing heavy fabrics together.
  // - Use simple, practical styling advice.

  // TONE:
  // - Friendly, short (2–4 lines)
  // - No outfit names in answer
  // - Ask 1 follow-up question

  // OUTPUT FORMAT (STRICT JSON):
  // {
  //   "answer": "",
  //   "suggested_outfit_ids": [],
  //   "suggested_new_outfits": [
  //     {
  //       "name": "",
  //       "item_ids": [],
  //       "category_id": "",
  //       "description": ""
  //     }
  //   ]
  // }

  // USER QUESTION: "${question.trim()}"
  // `;

  //       const openaiRes = await axios.post(
  //         process.env.OPENAI_URL,
  //         {
  //           model: process.env.OPENAI_MODEL,
  //           messages: [
  //             {
  //               role: "system",
  //               content: `You are a warm personal fashion stylist. The user is ${userGender}. Always reply in JSON only. Never list outfit names in the answer.`
  //             },
  //             { role: "user", content: prompt }
  //           ],
  //           response_format: { type: "json_object" }
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const rawResponse = openaiRes.data.choices[0].message.content;
  //       const structuredResponse = JSON.parse(rawResponse);

  //       const suggestedOutfitIds = structuredResponse.suggested_outfit_ids || [];
  //       const existingOutfits = await outfits.find({ _id: { $in: suggestedOutfitIds } });

  //       const allItemIds = (structuredResponse.suggested_new_outfits || [])
  //         .flatMap(out => out.item_ids);

  //       const populatedItems = await items.find({ _id: { $in: allItemIds } })
  //         .select("name category colors fabric season occasion tags images");

  //       const itemMap = {};
  //       populatedItems.forEach(i => { itemMap[i._id.toString()] = i; });

  //       const buildItemImageUrl = (rawImage) => {
  //         if (!rawImage) return null;
  //         return rawImage.startsWith("http") ? rawImage : `${process.env.BASE_URL}/uploads/items/${rawImage}`;
  //       };

  //       const newOutfitSuggestions = await Promise.all((structuredResponse.suggested_new_outfits || []).map(async (out) => {
  //         const validItemIds = out.item_ids.filter(id => itemMap[id.toString()]);
  //         const outfitItems = validItemIds.map(id => itemMap[id.toString()]);

  //         const imagesForCollage = outfitItems
  //           .map(item => buildItemImageUrl((item.images || [])[0]))
  //           .filter(Boolean);

  //         const itemsDetail = outfitItems.map(item => ({
  //           _id: item._id,
  //           name: item.name,
  //           category: item.category,
  //           images: (item.images || []).map(buildItemImageUrl).filter(Boolean)
  //         }));

  //         // Collage Logic
  //         let outfit_image = "";
  //         try {
  //           const collageFile = await GlobalFunctions.createOutfitCollage(imagesForCollage);
  //           if (collageFile) {
  //             outfit_image = `${process.env.BASE_URL}/uploads/items/${collageFile}`;
  //           } else {
  //             outfit_image = imagesForCollage[0] || "";
  //           }
  //         } catch (collageErr) {
  //           outfit_image = imagesForCollage[0] || "";
  //         }

  //         return {
  //           name: out.name,
  //           category_id: out.category_id,
  //           item_ids: out.item_ids,
  //           description: out.description,
  //           items: itemsDetail,
  //           images: imagesForCollage,
  //           outfit_image: outfit_image,
  //           is_saved: false
  //         };
  //       }));

  //       const finalResponse = {
  //         answer: structuredResponse.answer || "",
  //         suggested_outfits: existingOutfits.map(outfit => ({
  //           ...outfit._doc,
  //           outfit_image: buildItemImageUrl(outfit.images?.[0]),
  //           is_saved: true
  //         })),
  //         suggested_new_outfits: newOutfitSuggestions,
  //       };

  //       await WardrobeChats.create({
  //         user_id: userId,
  //         question: question.trim(),
  //         response: finalResponse,
  //         is_greeting: false
  //       });

  //       return global.successResponse(res, "Answered successfully", finalResponse);

  //     } catch (err) {
  //       console.error("Wardrobe Error:", err.message);
  //       return global.failResponse(res, err.message || "Failed to answer question", {});
  //     }
  //   },

  askWardrobeQuestion: async (req, res) => {
    try {
      const { question } = req.body;
      const userId = req.user._id;
      const ACTIVE = 1;

      if (!question || !question.trim()) {
        return global.failResponse(res, "Question is required", {});
      }

      // 1. FETCH USER DATA
      const userData = await Users.findById(userId).select("gender body_type hair_color complexion measurement");
      const userGender = userData?.gender || "not specified";
      const userBodyType = userData?.body_type || null;
      const userHairColor = userData?.hair_color || null;
      const userComplexion = userData?.complexion || null;
      const userMeasurement = userData?.measurement || null;

      const greetings = ['hello', 'hi', 'hey', 'hii', 'namaste', 'hola', 'sup', 'yo'];
      const isGreeting = greetings.includes(question.trim().toLowerCase());

      // 1.1 CHECK AI USAGE LIMIT (only for non-greeting questions)
      if (!isGreeting) {
        const limitCheck = await subscriptionHelper.checkLimit(userId, "ai");
        if (limitCheck.limitReached) {
          return global.successResponse(res, limitCheck.message, {
            limit_reached: true,
            limit: limitCheck.limit,
            current_usage: limitCheck.currentUsage
          });
        }
      }

      // 2. FETCH OUTFIT CATEGORIES THAT HAVE AT LEAST ONE SUBCATEGORY
      // Aur wahi IDs nikalenge jinka 'type' outfit hai.
      const allOutfitCategories = await Category.find({ type: "outfit", status: ACTIVE }).select("_id title");

      // Yahan hum filter kar rahe hain un categories ko jinki subcategories exist karti hain
      const validCategoriesWithSub = await Promise.all(
        allOutfitCategories.map(async (cat) => {
          const subExists = await SubCategory.findOne({ categoryId: cat._id, status: ACTIVE }); // categoryId field check kar lena model me
          return subExists ? { id: cat._id.toString(), title: cat.title } : null;
        })
      );

      // Null values hata kar final list taiyar
      const finalValidCategories = validCategoriesWithSub.filter(c => c !== null);

      if (isGreeting) {
        const greetingResponse = {
          answer: "Hey! I'm your personal stylist. What can I help you with today?\n\nYou can ask me things like:\n• 'What should I wear to a party tonight?'\n• 'Suggest a casual outfit for tomorrow'",
          suggested_outfits: [],
          suggested_new_outfits: [],
          missing_items: []
        };
        await WardrobeChats.create({ user_id: userId, question: question.trim(), response: greetingResponse, is_greeting: true });
        return global.successResponse(res, "Answered successfully", greetingResponse);
      }

      // 3. FETCH CLOSET AND EXISTING OUTFITS
      const [userItems, userOutfits] = await Promise.all([
        items.find({ createdBy: userId, status: ACTIVE }).limit(20).select("name category colors fabric occasion season"),
        outfits.find({ createdBy: userId, status: ACTIVE }).limit(5).select("name occasion"),
      ]);

      const userProfile = {
        gender: userGender,
        ...(userBodyType && { body_type: userBodyType }),
        ...(userHairColor && { hair_color: userHairColor }),
        ...(userComplexion && { complexion: userComplexion }),
        ...(userMeasurement && Object.values(userMeasurement).some(Boolean) && { measurements: userMeasurement }),
      };

      const closetContext = {
        items: userItems.map(item => ({
          id: item._id,
          name: item.name,
          category: item.category,
          ...(item.colors?.length && { colors: item.colors }),
          ...(item.fabric && { fabric: item.fabric }),
          ...(item.occasion && { occasion: item.occasion }),
          ...(item.season && { season: item.season }),
        })),
        outfits: userOutfits.map(outfit => ({ id: outfit._id, name: outfit.name, occasion: outfit.occasion })),
      };

      // 4. UPDATED PROMPT
      const prompt = `
You are a friendly fashion stylist.

USER PROFILE:
${JSON.stringify(userProfile)}

VALID OUTFIT CATEGORY IDs (Strictly use ONLY these ObjectIDs):
${JSON.stringify(finalValidCategories)}

USER CLOSET:
${JSON.stringify(closetContext)}

RULES:
- For "category_id", you MUST use one of the IDs from the VALID OUTFIT CATEGORY IDs list provided above.
- These categories are verified to have sub-categories.
- Tailor suggestions to the user's body_type, complexion, and hair_color if provided.
- Consider fabric weight, season, and occasion when pairing items.
- Ensure the suggested outfit is appropriate for a ${userGender} user.
- Use only available item IDs from the closet.

OUTPUT FORMAT (STRICT JSON):
{
  "answer": "Friendly stylist advice (2-4 lines). Ask 1 follow-up question.",
  "suggested_outfit_ids": [],
  "suggested_new_outfits": [
    {
      "name": "Outfit Name",
      "item_ids": [],
      "category_id": "STRICT_MONGO_ID_FROM_LIST",
      "description": "Style notes"
    }
  ]
}

USER QUESTION: "${question.trim()}"
`;

      // 5. OPENAI CALL
      const openaiRes = await axios.post(
        process.env.OPENAI_URL,
        {
          model: process.env.OPENAI_MODEL,
          messages: [
            { role: "system", content: "You are a warm personal fashion stylist with expertise in Indian and Western wear. Always reply in JSON. Personalise advice using the user's body type, complexion, and hair color when available. Only use the provided category ObjectIDs for outfits." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );

      const structuredResponse = JSON.parse(openaiRes.data.choices[0].message.content);

      // 6. RESPONSE PROCESSING (Items, Images, Collage)
      const suggestedOutfitIds = structuredResponse.suggested_outfit_ids || [];
      const existingOutfits = await outfits.find({ _id: { $in: suggestedOutfitIds } });

      const allItemIds = (structuredResponse.suggested_new_outfits || []).flatMap(out => out.item_ids);
      const populatedItems = await items.find({ _id: { $in: allItemIds } }).select("name category colors images");

      const itemMap = {};
      populatedItems.forEach(i => { itemMap[i._id.toString()] = i; });

      const buildItemImageUrl = (rawImage) => {
        if (!rawImage) return null;
        return rawImage.startsWith("http") ? rawImage : `${process.env.BASE_URL}/uploads/items/${rawImage}`;
      };

      const newOutfitSuggestions = await Promise.all((structuredResponse.suggested_new_outfits || []).map(async (out) => {
        const outfitItems = out.item_ids.map(id => itemMap[id.toString()]).filter(Boolean);
        const imagesForCollage = outfitItems.map(item => buildItemImageUrl(item.images?.[0])).filter(Boolean);

        let outfit_image = "";
        try {
          const collageFile = await GlobalFunctions.createOutfitCollage(imagesForCollage);
          outfit_image = collageFile ? `${process.env.BASE_URL}/uploads/items/${collageFile}` : (imagesForCollage[0] || "");
        } catch (err) {
          outfit_image = imagesForCollage[0] || "";
        }

        return {
          name: out.name,
          category_id: out.category_id, // This will now be a valid ID with a subcategory
          description: out.description,
          item_ids: out.item_ids,
          items: outfitItems.map(item => ({
            _id: item._id,
            name: item.name,
            images: (item.images || []).map(buildItemImageUrl).filter(Boolean)
          })),
          outfit_image,
          is_saved: false
        };
      }));

      const finalResponse = {
        answer: structuredResponse.answer || "",
        suggested_outfits: existingOutfits.map(out => ({ ...out._doc, outfit_image: buildItemImageUrl(out.images?.[0]), is_saved: true })),
        suggested_new_outfits: newOutfitSuggestions,
      };

      await WardrobeChats.create({ user_id: userId, question: question.trim(), response: finalResponse, is_greeting: false });
      return global.successResponse(res, "Answered successfully", finalResponse);

    } catch (err) {
      console.error("Wardrobe Error:", err.message);
      return global.failResponse(res, err.message || "Failed to answer question", {});
    }
  },

  getChatHistory: async (req, res) => {
    try {
      const page = Number(req.body.page) || 1;
      let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;

      async.parallel(
        {
          list: (callback) => {
            WardrobeChats.find({ user_id: req.user._id })
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(perPage)
              .lean()
              .exec()
              .then((data) => {
                callback(null, data.reverse()); // Reverse to get chronological order from bottom if frontend expects it, or keep it descending. Asc is usually older first. Let's just return descending.
              })
              .catch((err) => callback(err));
          },
          total_records: (callback) => {
            WardrobeChats.countDocuments({ user_id: req.user._id })
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
          // The list was returned ordered by newest first, then we reversed it. But the frontend might prefer newest first, so we'll just keep it that way. Oh wait, we reversed it.
          // Let's just undo reverse so that the pagination makes sense (page 1 = newest messages).
          result.list = result.list.reverse();
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
        }
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getDefaultQuestions: async (req, res) => {
    try {
      const settings = await GlobalSettings.findOne({}).select("bae_media_details");
      const questions = Array.isArray(settings?.bae_media_details) ? settings.bae_media_details : [];
      return global.successResponse(res, "Default questions retrieved successfully", questions);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  }
};

export default OutfitController;
