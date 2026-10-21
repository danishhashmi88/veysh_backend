import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import globalVariable, { MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
// models
import items from "../../../../../models/items.js";
import Posts from "../../../../../models/posts.js";
import planner from "../../../../../models/planner.js";
import Outfits from "../../../../../models/outfit.js";
import RentPurchase from "../../../../../models/rent-purchase.js";
import UserSubscription from "../../../../../models/user-subscription.js";
import GlobalFunctions from "../../../../../helpers/global-functions.js";

import subscriptionHelper from "../../../../../helpers/subscription-helper.js";

const buildRentImagesFromItem = (itemImages = []) => {
  const images = Array.isArray(itemImages) ? itemImages : itemImages ? [itemImages] : [];
  return images.filter(Boolean).map((img) => {
    if (typeof img === "string" && (img.startsWith("uploads/") || img.startsWith("http://") || img.startsWith("https://"))) {
      return img;
    }
    return `uploads/items/${img}`;
  });
};

const calculateCostPerWear = (price, wearCount) => {
  const itemPrice = Number(price) || 0;
  const count = Number(wearCount) || 0;
  return count > 0 ? Number((itemPrice / count).toFixed(2)) : 0;
};

const ItemsController = {
  save: async (req, res) => {
    try {
      const { name, category, sub_category, brand_name, price, statuses, purchased_on, occasion, mood, season, status, care, size, match_with_my_size, measurements, colors, fabric, notes, tags, wear_count, purchase_rent_toggle, purchase_rent_price } = req.body;
      console.log("req.body", req.body);
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      // Check subscription limit
      const limitCheck = await subscriptionHelper.checkLimit(userId, "item");
      if (limitCheck.limitReached) {
        return global.successResponse(res, limitCheck.message, {
          limit_reached: true,
          limit: limitCheck.limit,
          current_usage: limitCheck.currentUsage
        });
      }

      const formattedTitle = global.capitalizeFirstLetter(name.trim());

      const existingItem = await items.findOne({
        name: formattedTitle,
        createdBy: userId,
      });

      if (existingItem) {
        return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
      }

      let itemData = {
        name: global.capitalizeFirstLetter(name),
        category: Array.isArray(category) ? category : (typeof category === "string" ? category.split(",").map(id => id.trim()) : []),
        sub_category,
        statuses,
        brand_name,
        price,
        purchased_on,
        occasion,
        mood,
        season,
        status,
        care,
        size,
        match_with_my_size,
        measurements,
        colors,
        fabric,
        notes,
        tags,
        wear_count,
        purchase_rent_toggle,
        purchase_rent_price: purchase_rent_toggle ? purchase_rent_price : null,
        createdBy: userId,
      };

      if (brand_name !== undefined) itemData.brand_name = brand_name;
      if (price !== undefined) itemData.price = price;
      if (purchased_on !== undefined) itemData.purchased_on = purchased_on;

      if (statuses !== undefined) itemData.statuses = statuses;
      if (status !== undefined) itemData.status = status;
      if (care !== undefined) itemData.care = care;
      if (size !== undefined) itemData.size = size;
      if (match_with_my_size !== undefined) itemData.match_with_my_size = match_with_my_size;

      if (occasion !== undefined) itemData.occasion = occasion;

      if (mood !== undefined) itemData.mood = mood;
      if (season !== undefined) itemData.season = season;

      if (wear_count !== undefined) itemData.wear_count = wear_count;
      itemData.cost_per_wear = calculateCostPerWear(itemData.price, itemData.wear_count);

      if (purchase_rent_toggle !== undefined) itemData.purchase_rent_toggle = purchase_rent_toggle;

      if (purchase_rent_toggle) {
        if (purchase_rent_price !== undefined) {
          itemData.purchase_rent_price = purchase_rent_price;
        }
      } else {
        itemData.purchase_rent_price = null;
      }

      if (colors !== undefined) {
        itemData.colors = typeof colors === "string" ? JSON.parse(colors) : colors;
      }

      if (fabric !== undefined) {
        itemData.fabric = typeof fabric === "string" ? JSON.parse(fabric) : fabric;
      }

      if (tags !== undefined) {
        itemData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      }

      if (measurements !== undefined) {
        itemData.measurements = typeof measurements === "string" ? JSON.parse(measurements) : measurements;
      }

      if (notes !== undefined) itemData.notes = notes;

      const images = await global.uploadFile(req, "images", "items");
      if (images) {
        itemData.images = Array.isArray(images)
          ? images.map((img) => `${img}`)
          : [`${images}`];
      }

      const newItem = await items.create(itemData);

      if (newItem.purchase_rent_toggle === true) {
        await RentPurchase.create({
          item_id: newItem._id,
          outfit_id: null,
          purchase_rent_toggle: true,
          purchase_rent_price: newItem.purchase_rent_price ?? null,
          images: null,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      return global.successResponse(res, global.msgByReq(req, "item_added_success"), { item: newItem });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  details: async (req, res) => {
    try {
      const { o_id } = req.query;
      const itemId = new ObjectId(o_id);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await items.aggregate([
        { $match: { _id: itemId } },
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
            from: "outfits",
            let: { itemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: {
                      if: { $isArray: "$item_id" },
                      then: { $in: ["$$itemId", "$item_id"] },
                      else: { $eq: ["$$itemId", "$item_id"] }
                    }
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: "outfits",
          },
        },
        {
          $addFields: {
            outfit_count: { $size: "$outfits" },
          },
        },
        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),
        {
          $project: {
            name: 1,
            brand_name: 1,
            price: 1,
            purchased_on: 1,
            occasion: 1,
            mood: 1,
            season: 1,
            status: 1,
            statuses: 1,
            care: 1,
            size: 1,
            match_with_my_size: 1,
            measurements: 1,
            colors: 1,
            fabric: 1,
            notes: 1,
            tags: 1,
            images: global.itemMultiImageQuery("images"),
            category: 1,
            sub_category: { $arrayElemAt: ["$sub_category", 0] },
            outfit_count: 1,
            outfits: 1,
            wear_count: 1,
            purchase_rent_toggle: 1,
            purchase_rent_price: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ]);

      let item = result[0] || null;
      if (!item || !item._id) {
        return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
      }

      const userId = item.createdBy?._id ? new ObjectId(item.createdBy._id) : new ObjectId(item.createdBy);

      const wearCountResult = await planner.aggregate([
        {
          $match: {
            createdBy: userId,
            outfit_id: { $exists: true, $ne: null },
            event_date: { $lt: today },
          },
        },
        {
          $lookup: {
            from: "outfits",
            localField: "outfit_id",
            foreignField: "_id",
            as: "outfit",
          },
        },
        { $unwind: "$outfit" },
        {
          $match: {
            "outfit.item_id": itemId,
          },
        },
        { $count: "totalItemWearCount" },
      ]);

      item.totalItemWearCount = wearCountResult[0]?.totalItemWearCount ?? 0;
      const itemPrice = Number(item.price) || 0;
      const wearCount = Number(item.wear_count) || 0;
      const costPerWear = wearCount > 0 ? Number((itemPrice / wearCount).toFixed(2)) : 0;
      item.cost_per_wear = costPerWear;

      if (item.createdBy && item.createdBy.profile_image) {
        item.createdBy.profile_image = global.buildUserImageUrl(item.createdBy.profile_image);
      }
      if (item.updatedBy && item.updatedBy.profile_image) {
        item.updatedBy.profile_image = global.buildUserImageUrl(item.updatedBy.profile_image);
      }

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, item);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  edit: async (req, res) => {
    try {
      const { o_id, name, category, sub_category, brand_name, price, statuses, purchased_on, occasion, mood, season, status, care, size, match_with_my_size, measurements, colors, fabric, notes, tags, wear_count, purchase_rent_price, purchase_rent_toggle } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid item ID", {});
      }

      if (name) {
        const formattedTitle = global.capitalizeFirstLetter(name.trim());

        const existingItem = await items.findOne({
          name: formattedTitle,
          _id: { $ne: new ObjectId(o_id) },
          createdBy: userId,
        });

        if (existingItem) {
          return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
        }
      }

      let updateData = {
        createdBy: userId,
        updatedBy: userId,
      };

      if (name !== undefined) updateData.name = global.capitalizeFirstLetter(name.trim());

      if (category !== undefined) {
        updateData.category = Array.isArray(category) ? category : (typeof category === "string" ? category.split(",").map(id => id.trim()) : [category]);
      }
      if (sub_category !== undefined) updateData.sub_category = sub_category;
      if (brand_name !== undefined) updateData.brand_name = brand_name;
      if (price !== undefined) updateData.price = price;
      if (purchased_on !== undefined) updateData.purchased_on = purchased_on;

      if (statuses !== undefined) updateData.statuses = statuses;
      if (status !== undefined) updateData.status = status;
      if (care !== undefined) updateData.care = care;
      if (size !== undefined) updateData.size = size;
      if (match_with_my_size !== undefined) updateData.match_with_my_size = match_with_my_size === true || match_with_my_size === "true";

      if (occasion !== undefined) updateData.occasion = occasion;
      if (mood !== undefined) updateData.mood = mood;
      if (season !== undefined) updateData.season = season;
      if (notes !== undefined) updateData.notes = notes;
      if (wear_count !== undefined) updateData.wear_count = wear_count;
      const currentItem = await items.findOne({ _id: new ObjectId(o_id), createdBy: userId }).select("price wear_count");
      const finalPriceForCost = updateData.price !== undefined ? updateData.price : currentItem?.price;
      const finalWearCountForCost = updateData.wear_count !== undefined ? updateData.wear_count : currentItem?.wear_count;
      updateData.cost_per_wear = calculateCostPerWear(finalPriceForCost, finalWearCountForCost);

      if (purchase_rent_toggle !== undefined) {
        const normalizedToggle = purchase_rent_toggle === true || purchase_rent_toggle === "true";
        updateData.purchase_rent_toggle = normalizedToggle;
        if (normalizedToggle) {
          if (purchase_rent_price !== undefined) {
            updateData.purchase_rent_price = purchase_rent_price;
          }
        } else {
          updateData.purchase_rent_price = null;
        }
      } else if (purchase_rent_price !== undefined) {
        updateData.purchase_rent_price = purchase_rent_price;
      }

      if (colors !== undefined) {
        updateData.colors = typeof colors === "string" ? JSON.parse(colors) : colors;
      }

      if (fabric !== undefined) {
        updateData.fabric = typeof fabric === "string" ? JSON.parse(fabric) : fabric;
      }

      if (tags !== undefined) {
        updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      }

      if (measurements !== undefined) {
        updateData.measurements = typeof measurements === "string" ? JSON.parse(measurements) : measurements;
      }

      const images = await global.uploadFile(req, "images", "items");
      if (images) {
        updateData.images = Array.isArray(images)
          ? images.map((img) => `${img}`)
          : [`${images}`];
      }

      items
        .updateOne({ _id: new ObjectId(o_id), createdBy: userId }, { $set: updateData })
        .then(async (result) => {
          const updatedItem = await items.findOne({ _id: new ObjectId(o_id), createdBy: userId });
          if (updatedItem && updatedItem.purchase_rent_toggle === true) {
            await RentPurchase.findOneAndUpdate(
              { item_id: updatedItem._id },
              {
                $set: {
                  outfit_id: null,
                  purchase_rent_toggle: true,
                  purchase_rent_price: updatedItem.purchase_rent_price ?? null,
                  images: null,
                  updatedBy: userId,
                },
                $setOnInsert: {
                  createdBy: userId,
                },
              },
              { upsert: true, new: true },
            );
          } else if (updatedItem) {
            await RentPurchase.deleteOne({ item_id: updatedItem._id });
          }
          return global.successResponse(res, global.msg(req, res, "item_updated_success"), result);
        })
        .catch((err) => {
          return global.failResponse(res, err.message, err);
        });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  enableRentByItemId: async (req, res) => {
    try {
      const { item_id, purchase_rent_price } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(item_id)) {
        return global.failResponse(res, "Invalid item_id", {});
      }

      const existingItem = await items.findOne({
        _id: new ObjectId(item_id),
        createdBy: new ObjectId(userId),
      });

      if (!existingItem) {
        return global.failResponse(res, "Item not found", {});
      }

      if (existingItem.purchase_rent_toggle === true) {
        return global.failResponse(res, "Purchase/Rent toggle is already ON for this item", {});
      }

      existingItem.purchase_rent_toggle = true;
      existingItem.purchase_rent_price = purchase_rent_price ?? null;
      existingItem.updatedBy = userId;
      await existingItem.save();

      const uploadedImages = await global.uploadFile(req, "images", "rentPurachase");
      const rentImages = uploadedImages
        ? (Array.isArray(uploadedImages)
          ? uploadedImages.map((img) => `uploads/rentPurachase/${img}`)
          : [`uploads/rentPurachase/${uploadedImages}`])
        : [];

      const rentPurchaseRecord = await RentPurchase.create({
        item_id: existingItem._id,
        outfit_id: null,
        purchase_rent_toggle: true,
        purchase_rent_price: purchase_rent_price ?? null,
        images: rentImages,
        createdBy: userId,
        updatedBy: userId,
      });

      return global.successResponse(res, "Purchase/Rent enabled successfully", {
        item: existingItem,
        rent_purchase: rentPurchaseRecord,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  incrementWearCount: async (req, res) => {
    try {
      const { item_id } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(item_id)) {
        return global.failResponse(res, "Invalid item_id", {});
      }

      const updatedItem = await items.findOneAndUpdate(
        { _id: new ObjectId(item_id), createdBy: new ObjectId(userId) },
        { $inc: { wear_count: 1 }, $set: { updatedBy: userId } },
        { new: true },
      );

      if (!updatedItem) {
        return global.failResponse(res, "Item not found", {});
      }

      const recalculatedCostPerWear = calculateCostPerWear(updatedItem.price, updatedItem.wear_count);
      if ((Number(updatedItem.cost_per_wear) || 0) !== recalculatedCostPerWear) {
        await items.updateOne(
          { _id: updatedItem._id, createdBy: new ObjectId(userId) },
          { $set: { cost_per_wear: recalculatedCostPerWear } },
        );
        updatedItem.cost_per_wear = recalculatedCostPerWear;
      }

      return global.successResponse(res, "Wear count updated successfully", {
        item_id: updatedItem._id,
        wear_count: Number(updatedItem.wear_count) || 0,
        cost_per_wear: Number(updatedItem.cost_per_wear) || 0,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  shareOnFeed: async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(itemId)) {
        return global.failResponse(res, "Invalid item ID", {});
      }

      const item = await items.findOne({
        _id: itemId,
        createdBy: userId,
      });

      if (!item) {
        return global.failResponse(res, "Item not found", {});
      }

      if (item.is_shared === true) {
        return global.failResponse(res, "Item already shared to feed", {});
      }

      const captionParts = [];

      if (item.brand_name) captionParts.push(`Brand: ${item.brand_name}`);
      if (item.price) captionParts.push(`Price: ₹${item.price}`);
      if (item.size) captionParts.push(`Size: ${item.size}`);
      if (item.occasion) captionParts.push(`Occasion: ${item.occasion}`);
      if (item.mood) captionParts.push(`Mood: ${item.mood}`);
      if (item.season) captionParts.push(`Season: ${item.season}`);
      if (item.care) captionParts.push(`Care: ${item.care}`);
      if (item.statuses) captionParts.push(`Status: ${item.statuses}`);
      if (item.notes) captionParts.push(`Notes: ${item.notes}`);

      const caption = captionParts.join(" | ");

      const postData = {
        name: item.name,
        caption,
        tags: item.tags || [],
        collaborate: false,
        images: Array.isArray(item.images) ? item.images : item.images ? [item.images] : [],
        videos: [],
        collection_id: item._id,
        createdBy: userId,
        updatedBy: userId,
      };

      const post = await Posts.create(postData);

      // Mark item as shared
      item.is_shared = true;
      await item.save();

      return global.successResponse(res, "Item shared to feed successfully", {
        item_id: item._id,
        post,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  list: async (req, res) => {
    // const globalSearch = ["name", "brand_name"];
    const globalSearch = ["name", "brand_name", "colors", "fabric", "tags", "notes"];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    let json = {
      createdBy: new ObjectId(req.user._id),
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    let sorting = await global.getSorting2(req);

    async.parallel(
      {
        list: (callback) => {
          items
            .aggregate([
              { $match: json },

              {
                $addFields: {
                  price_sort: { $toDouble: "$price" },
                },
              },

              { $sort: sorting },

              { $skip: skip },

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
                  from: "outfits",
                  let: { itemId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$item_id", "$$itemId"] },
                      },
                    },
                    { $project: { name: 1 } },
                  ],
                  as: "outfits",
                },
              },
              {
                $addFields: {
                  outfit_count: { $size: "$outfits" },
                },
              },
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
                        email: 1,
                        username: 1,
                        full_name: 1,
                        profile_image: 1,
                      },
                    },
                  ],
                  as: "createdBy",
                },
              },
              {
                $project: {
                  name: 1,
                  brand_name: 1,
                  price: 1,
                  purchased_on: 1,
                  occasion: 1,
                  mood: 1,
                  season: 1,
                  status: 1,
                  statuses: 1,
                  care: 1,
                  size: 1,
                  match_with_my_size: 1,
                  measurements: 1,
                  colors: 1,
                  fabric: 1,
                  notes: 1,
                  tags: 1,
                  images: GlobalFunctions.itemMultiImageQuery("images"),
                  createdBy: { $arrayElemAt: ["$createdBy", 0] },
                  category: 1,
                  sub_category: { $arrayElemAt: ["$sub_category", 0] },
                  outfit_count: 1,
                  outfits: 1,
                  wear_count: 1,
                  purchase_rent_toggle: 1,
                  purchase_rent_price: 1,
                  createdAt: 1,
                  updatedAt: 1,
                },
              },
            ])
            .exec()
            .then((result) => callback(null, result))
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          items
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
        if (result.list) {
          result.list = result.list.map((item) => ({
            ...item,
            // images: global.buildItemImageUrl(item.images || []),
            // Process createdBy profile_image if exists
            createdBy: item.createdBy ? {
              _id: item.createdBy._id,
              name: item.createdBy.name,
              email: item.createdBy.email,
              username: item.createdBy.username,
              full_name: item.createdBy.full_name,
              profile_image: global.buildUserImageUrl(item.createdBy.profile_image)
            } : null,
          }));
        }
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      },
    );
  },

  delete: async (req, res) => {
    const { o_id } = req.query;
    const ItemId = new ObjectId(o_id);

    try {
      // Check if item is part of any outfit
      const outfitWithItem = await Outfits.findOne({
        createdBy: req.user._id,
        item_id: { $in: [ItemId, o_id] }
      });

      if (outfitWithItem) {
        return global.failResponse(res, `This item is part of the outfit '${outfitWithItem.name}'. Please remove it from the outfit first.`, {});
      }

      await items.deleteOne({ _id: ItemId, createdBy: req.user._id });

      return global.successResponse(res, global.msg(req, res, "item_deleted_success"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default ItemsController;
