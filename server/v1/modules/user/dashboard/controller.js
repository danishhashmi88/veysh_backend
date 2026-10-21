import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { ACTIVE, DEFAULT_USER_PROFILE, MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

// models
import planner from "../../../../../models/planner.js";
import items from "../../../../../models/items.js";
import outfits from "../../../../../models/outfit.js";
import posts from "../../../../../models/posts.js";
import Category from "../../../../../models/category.js";
import ReportedPosts from "../../../../../models/reported-posts.js";
import UserModel from "../../../../../models/users.js";
// import Category from "../../../../../models/category.js";

const DashboardController = {
  /**
   * Wardrobe insights by ITEMS (from planner events: event -> outfit -> item_id).
   * Past = event_date < today, Future = event_date > today (today excluded).
   * most_worn = items worn most in past | least_worn = items worn least in past | never_worn = items only in future (never worn)
   */
  // getWardrobeInsights: async (req, res) => {
  //   try {
  //     const { type } = req.body;
  //     const userId = req.user._id;

  //     if (!type || !["most_worn", "least_worn", "never_worn"].includes(type)) {
  //       return global.failResponse(res, "Invalid type. Must be: most_worn, least_worn, or never_worn", {});
  //     }

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     const allEvents = await planner
  //       .find({
  //         createdBy: new ObjectId(userId),
  //         $or: [
  //           { outfit_id: { $exists: true, $ne: null } },
  //           { item_id: { $exists: true, $ne: null } }
  //         ]
  //       })
  //       .populate({ path: "outfit_id", select: "item_id" })
  //       .lean();

  //     const pastEvents = allEvents.filter((event) => {
  //       const eventDate = new Date(event.event_date);
  //       eventDate.setHours(0, 0, 0, 0);
  //       return eventDate <= today;
  //     });

  //     const futureEvents = allEvents.filter((event) => {
  //       const eventDate = new Date(event.event_date);
  //       eventDate.setHours(0, 0, 0, 0);
  //       return eventDate > today;
  //     });

  //     const itemUsageCount = {};
  //     const pastItemIds = new Set();
  //     const outfitUsageCount = {};
  //     const pastOutfitIds = new Set();

  //     pastEvents.forEach((event) => {
  //       let itemIds = [];
  //       if (event.outfit_id && event.outfit_id.item_id) {
  //         itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
  //       }
  //       if (event.item_id) {
  //         let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
  //         itemIds = [...itemIds, ...directItems];
  //       }

  //       itemIds.forEach((itemIdObj) => {
  //         if (!itemIdObj) return;
  //         const idStr = itemIdObj.toString ? itemIdObj.toString() : String(itemIdObj);
  //         if (!ObjectId.isValid(idStr)) return;
  //         pastItemIds.add(idStr);
  //         itemUsageCount[idStr] = (itemUsageCount[idStr] || 0) + 1;
  //       });

  //       if (event.outfit_id && event.outfit_id._id) {
  //         const outfitIdStr = event.outfit_id._id.toString();
  //         if (ObjectId.isValid(outfitIdStr)) {
  //           pastOutfitIds.add(outfitIdStr);
  //           outfitUsageCount[outfitIdStr] = (outfitUsageCount[outfitIdStr] || 0) + 1;
  //         }
  //       }
  //     });

  //     const futureItemIds = new Set();
  //     const futureOutfitIds = new Set();

  //     futureEvents.forEach((event) => {
  //       let itemIds = [];
  //       if (event.outfit_id && event.outfit_id.item_id) {
  //         itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
  //       }
  //       if (event.item_id) {
  //         let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
  //         itemIds = [...itemIds, ...directItems];
  //       }

  //       itemIds.forEach((itemIdObj) => {
  //         if (!itemIdObj) return;
  //         const idStr = itemIdObj.toString ? itemIdObj.toString() : String(itemIdObj);
  //         if (ObjectId.isValid(idStr)) futureItemIds.add(idStr);
  //       });

  //       if (event.outfit_id && event.outfit_id._id) {
  //         const outfitIdStr = event.outfit_id._id.toString();
  //         if (ObjectId.isValid(outfitIdStr)) {
  //           futureOutfitIds.add(outfitIdStr);
  //         }
  //       }
  //     });

  //     let itemIdsToFetch = [];
  //     let outfitIdsToFetch = [];

  //     if (type === "most_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  //       itemIdsToFetch = Object.keys(itemUsageCount).filter(
  //         (id) => itemUsageCount[id] === maxCount && maxCount > 0,
  //       );

  //       const oCounts = Object.values(outfitUsageCount);
  //       const oMax = oCounts.length > 0 ? Math.max(...oCounts) : 0;
  //       outfitIdsToFetch = Object.keys(outfitUsageCount).filter(
  //         (id) => outfitUsageCount[id] === oMax && oMax > 0,
  //       );
  //     } else if (type === "least_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  //       itemIdsToFetch = Object.keys(itemUsageCount).filter(
  //         (id) => itemUsageCount[id] === minCount && minCount > 0,
  //       );

  //       const oCounts = Object.values(outfitUsageCount);
  //       const oMin = oCounts.length > 0 ? Math.min(...oCounts) : 0;
  //       outfitIdsToFetch = Object.keys(outfitUsageCount).filter(
  //         (id) => outfitUsageCount[id] === oMin && oMin > 0,
  //       );
  //     } else if (type === "never_worn") {
  //       itemIdsToFetch = Array.from(futureItemIds).filter(
  //         (id) => !pastItemIds.has(id) && ObjectId.isValid(id),
  //       );

  //       outfitIdsToFetch = Array.from(futureOutfitIds).filter(
  //         (id) => !pastOutfitIds.has(id) && ObjectId.isValid(id),
  //       );
  //     }

  //     let resultItems = [];
  //     if (itemIdsToFetch.length > 0) {
  //       const validIds = itemIdsToFetch
  //         .filter((id) => ObjectId.isValid(id))
  //         .map((id) => new ObjectId(id));

  //       if (validIds.length > 0) {
  //         resultItems = await items
  //           .find({
  //             _id: { $in: validIds },
  //             createdBy: new ObjectId(userId),
  //             status: ACTIVE,
  //           })
  //           .select("name price images")
  //           .lean();

  //         resultItems = resultItems.map((item) => {
  //           const idStr = item._id.toString();
  //           const usage_count =
  //             type === "never_worn" ? 0 : itemUsageCount[idStr] || 0;
  //           return { ...item, usage_count };
  //         });
  //       }
  //     }

  //     let resultOutfits = [];
  //     if (outfitIdsToFetch.length > 0) {
  //       const validIds = outfitIdsToFetch
  //         .filter((id) => ObjectId.isValid(id))
  //         .map((id) => new ObjectId(id));

  //       if (validIds.length > 0) {
  //         resultOutfits = await outfits
  //           .find({
  //             _id: { $in: validIds },
  //             createdBy: new ObjectId(userId),
  //             status: ACTIVE,
  //           })
  //           .select("name images")
  //           .lean();

  //         resultOutfits = resultOutfits.map((outfit) => {
  //           const idStr = outfit._id.toString();
  //           const usage_count = type === "never_worn" ? 0 : outfitUsageCount[idStr] || 0;
  //           return { ...outfit, usage_count };
  //         });
  //       }
  //     }

  //     const processedItems = resultItems.map((item) => ({
  //       _id: item._id,
  //       title: item.name,
  //       price: item.price,
  //       image:
  //         item.images && item.images.length > 0
  //           ? `${process.env.BASE_URL}/uploads/items/${item.images[0]}`
  //           : `${process.env.BASE_URL}/configs/default/${DEFAULT_USER_PROFILE}`,
  //       usage_count: item.usage_count ?? 0,
  //     }));

  //     const processedOutfits = resultOutfits.map((outfit) => ({
  //       _id: outfit._id,
  //       title: outfit.name,
  //       image:
  //         outfit.images && outfit.images.length > 0
  //           ? `${process.env.BASE_URL}/${outfit.images[0]}`
  //           : `${process.env.BASE_URL}/configs/default/${DEFAULT_USER_PROFILE}`,
  //       usage_count: outfit.usage_count ?? 0,
  //     }));

  //     let average_closet_value = 0;
  //     if (processedItems.length > 0) {
  //       const totalValue = processedItems.reduce((acc, item) => {
  //         const price = parseFloat(item.price);
  //         return acc + (isNaN(price) ? 0 : price);
  //       }, 0);
  //       average_closet_value = totalValue / processedItems.length;
  //     }

  //     return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
  //       items: processedItems,
  //       outfits: processedOutfits,
  //       total_count: processedItems.length + processedOutfits.length,
  //       type,
  //       average_closet_value: parseFloat(average_closet_value.toFixed(2))
  //     });
  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },

  // getWardrobeInsights: async (req, res) => {
  //   try {
  //     const { type } = req.body;
  //     const userId = req.user._id;

  //     if (!type || !["most_worn", "least_worn", "never_worn"].includes(type)) {
  //       return global.failResponse(res, "Invalid type. Must be: most_worn, least_worn, or never_worn", {});
  //     }

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     const allEvents = await planner
  //       .find({
  //         createdBy: new ObjectId(userId),
  //         $or: [
  //           { outfit_id: { $exists: true, $ne: null } },
  //           { item_id: { $exists: true, $ne: null } }
  //         ]
  //       })
  //       .populate({ path: "outfit_id", select: "item_id" })
  //       .lean();

  //     const pastEvents = allEvents.filter((event) => {
  //       const eventDate = new Date(event.event_date);
  //       eventDate.setHours(0, 0, 0, 0);
  //       return eventDate <= today;
  //     });

  //     const futureEvents = allEvents.filter((event) => {
  //       const eventDate = new Date(event.event_date);
  //       eventDate.setHours(0, 0, 0, 0);
  //       return eventDate > today;
  //     });

  //     const itemUsageCount = {};
  //     const pastItemIds = new Set();

  //     pastEvents.forEach((event) => {
  //       let itemIds = [];
  //       if (event.outfit_id && event.outfit_id.item_id) {
  //         itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
  //       }
  //       if (event.item_id) {
  //         let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
  //         itemIds = [...itemIds, ...directItems];
  //       }

  //       itemIds.forEach((itemIdObj) => {
  //         if (!itemIdObj) return;
  //         const idStr = itemIdObj.toString ? itemIdObj.toString() : String(itemIdObj);
  //         if (!ObjectId.isValid(idStr)) return;
  //         pastItemIds.add(idStr);
  //         itemUsageCount[idStr] = (itemUsageCount[idStr] || 0) + 1;
  //       });
  //     });

  //     const futureItemIds = new Set();

  //     futureEvents.forEach((event) => {
  //       let itemIds = [];
  //       if (event.outfit_id && event.outfit_id.item_id) {
  //         itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
  //       }
  //       if (event.item_id) {
  //         let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
  //         itemIds = [...itemIds, ...directItems];
  //       }

  //       itemIds.forEach((itemIdObj) => {
  //         if (!itemIdObj) return;
  //         const idStr = itemIdObj.toString ? itemIdObj.toString() : String(itemIdObj);
  //         if (ObjectId.isValid(idStr)) futureItemIds.add(idStr);
  //       });
  //     });

  //     let itemIdsToFetch = [];

  //     if (type === "most_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  //       itemIdsToFetch = Object.keys(itemUsageCount).filter(
  //         (id) => itemUsageCount[id] === maxCount && maxCount > 0
  //       );
  //     } else if (type === "least_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  //       itemIdsToFetch = Object.keys(itemUsageCount).filter(
  //         (id) => itemUsageCount[id] === minCount && minCount > 0
  //       );
  //     } else if (type === "never_worn") {
  //       itemIdsToFetch = Array.from(futureItemIds).filter(
  //         (id) => !pastItemIds.has(id) && ObjectId.isValid(id)
  //       );
  //     }

  //     let resultItems = [];
  //     if (itemIdsToFetch.length > 0) {
  //       const validIds = itemIdsToFetch
  //         .filter((id) => ObjectId.isValid(id))
  //         .map((id) => new ObjectId(id));

  //       if (validIds.length > 0) {
  //         resultItems = await items
  //           .find({
  //             _id: { $in: validIds },
  //             createdBy: new ObjectId(userId),
  //             status: ACTIVE,
  //           })
  //           .select("name price images")
  //           .lean();

  //         resultItems = resultItems.map((item) => {
  //           const idStr = item._id.toString();
  //           const usage_count = type === "never_worn" ? 0 : itemUsageCount[idStr] || 0;
  //           return { ...item, usage_count };
  //         });
  //       }
  //     }

  //     const processedItems = resultItems.map((item) => ({
  //       _id: item._id,
  //       title: item.name,
  //       price: item.price,
  //       image:
  //         item.images && item.images.length > 0
  //           ? `${process.env.BASE_URL}/uploads/items/${item.images[0]}`
  //           : `${process.env.BASE_URL}/configs/default/${DEFAULT_USER_PROFILE}`,
  //       usage_count: item.usage_count ?? 0,
  //     }));

  //     let average_closet_value = 0;
  //     if (processedItems.length > 0) {
  //       const totalValue = processedItems.reduce((acc, item) => {
  //         const price = parseFloat(item.price);
  //         return acc + (isNaN(price) ? 0 : price);
  //       }, 0);
  //       average_closet_value = totalValue / processedItems.length;
  //     }

  //     return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
  //       items: processedItems,
  //       total_count: processedItems.length,
  //       type,
  //       average_closet_value: parseFloat(average_closet_value.toFixed(2))
  //     });
  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },

  // getWardrobeInsights: async (req, res) => {
  //   try {
  //     const { type } = req.body;
  //     const userId = req.user._id;
  //     const ACTIVE = 1;

  //     if (!type || !["most_worn", "least_worn", "never_worn"].includes(type)) {
  //       return global.failResponse(res, "Invalid type. Must be: most_worn, least_worn, or never_worn", {});
  //     }

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     // 1. Saare past events nikaalo usage count calculate karne ke liye
  //     const allEvents = await planner
  //       .find({
  //         createdBy: new ObjectId(userId),
  //         event_date: { $lte: today }, // Sirf aaj tak ke events
  //         $or: [
  //           { outfit_id: { $exists: true, $ne: null } },
  //           {
  //             $and: [
  //               { item_id: { $exists: true } },
  //               { item_id: { $ne: null } },
  //               { item_id: { $ne: [] } },
  //             ],
  //           },
  //         ]
  //       })
  //       .populate({ path: "outfit_id", select: "item_id" })
  //       .lean();

  //     const itemUsageCount = {};
  //     const usedItemIdsSet = new Set();

  //     allEvents.forEach((event) => {
  //       let itemIds = [];
  //       if (event.outfit_id && event.outfit_id.item_id) {
  //         itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
  //       }
  //       if (event.item_id) {
  //         let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
  //         itemIds = [...itemIds, ...directItems];
  //       }

  //       itemIds.forEach((itemIdObj) => {
  //         if (!itemIdObj) return;
  //         const idStr = itemIdObj.toString();
  //         if (!ObjectId.isValid(idStr)) return;
  //         usedItemIdsSet.add(idStr);
  //         itemUsageCount[idStr] = (itemUsageCount[idStr] || 0) + 1;
  //       });
  //     });

  //     let itemIdsToFetch = [];

  //     if (type === "most_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       if (counts.length > 0) {
  //         const maxCount = Math.max(...counts);
  //         itemIdsToFetch = Object.keys(itemUsageCount).filter(id => itemUsageCount[id] === maxCount);
  //       }
  //     }
  //     else if (type === "least_worn") {
  //       const counts = Object.values(itemUsageCount);
  //       if (counts.length > 0) {
  //         const maxCount = Math.max(...counts);
  //         const minCount = Math.min(...counts);

  //         // FIX: Agar Max aur Min same hai, toh least worn khali dikhao redundancy se bachne ke liye
  //         if (maxCount !== minCount) {
  //           itemIdsToFetch = Object.keys(itemUsageCount).filter(id => itemUsageCount[id] === minCount);
  //         }
  //       }
  //     }
  //     else if (type === "never_worn") {
  //       // FIX: Closet ke wo saare items jo usedItemIdsSet mein NAHI hain
  //       const allItems = await items.find({ createdBy: new ObjectId(userId), status: ACTIVE }).select("_id").lean();
  //       itemIdsToFetch = allItems
  //         .filter(item => !usedItemIdsSet.has(item._id.toString()))
  //         .map(item => item._id.toString());
  //     }

  //     let resultItems = [];
  //     if (itemIdsToFetch.length > 0) {
  //       const validIds = itemIdsToFetch.map(id => new ObjectId(id));

  //       resultItems = await items
  //         .find({
  //           _id: { $in: validIds },
  //           createdBy: new ObjectId(userId),
  //           status: ACTIVE,
  //         })
  //         .select("name price images")
  //         .lean();

  //       resultItems = resultItems.map((item) => {
  //         const idStr = item._id.toString();
  //         return {
  //           ...item,
  //           usage_count: itemUsageCount[idStr] || 0
  //         };
  //       });
  //     }

  //     const processedItems = resultItems.map((item) => ({
  //       _id: item._id,
  //       title: item.name,
  //       price: item.price,
  //       image: item.images?.length > 0
  //         ? `${process.env.BASE_URL}/uploads/items/${item.images[0]}`
  //         : `${process.env.BASE_URL}/configs/default/default.png`,
  //       usage_count: item.usage_count,
  //     }));

  //     // Closet average value calculation
  //     let average_closet_value = 0;
  //     if (processedItems.length > 0) {
  //       const totalValue = processedItems.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0);
  //       average_closet_value = totalValue / processedItems.length;
  //     }

  //     return global.successResponse(res, "Wardrobe insights retrieved successfully", {
  //       items: processedItems,
  //       total_count: processedItems.length,
  //       type,
  //       average_closet_value: parseFloat(average_closet_value.toFixed(2))
  //     });
  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },

  getWardrobeInsights: async (req, res) => {
    try {
      const { type } = req.body;
      const userId = req.user._id;
      const ACTIVE = 1;

      if (!type || !["most_worn", "least_worn", "never_worn"].includes(type)) {
        return global.failResponse(res, "Invalid type. Must be: most_worn, least_worn, or never_worn", {});
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Planner se events fetch karo
      const allEvents = await planner
        .find({
          createdBy: new ObjectId(userId),
          event_date: { $lte: today },
          $or: [
            { outfit_id: { $exists: true, $ne: null } },
            {
              $and: [
                { item_id: { $exists: true } },
                { item_id: { $ne: null } },
                { item_id: { $ne: [] } },
              ],
            },
          ]
        })
        .populate({ path: "outfit_id", select: "item_id" })
        .lean();

      const plannerCounts = {};
      allEvents.forEach((event) => {
        let itemIds = [];
        if (event.outfit_id?.item_id) {
          itemIds = Array.isArray(event.outfit_id.item_id) ? event.outfit_id.item_id : [event.outfit_id.item_id];
        }
        if (event.item_id) {
          let directItems = Array.isArray(event.item_id) ? event.item_id : [event.item_id];
          itemIds = [...itemIds, ...directItems];
        }
        itemIds.forEach((id) => {
          if (!id) return;
          const sId = id.toString();
          plannerCounts[sId] = (plannerCounts[sId] || 0) + 1;
        });
      });

      // 2. Saare items fetch karo manual wear_count ke liye
      const allUserItems = await items.find({
        createdBy: new ObjectId(userId),
        status: ACTIVE
      }).lean();

      // 3. Total Count Calculate karo (Planner + Manual)
      const combinedData = allUserItems.map(item => {
        const pCount = plannerCounts[item._id.toString()] || 0;
        const mCount = Number(item.wear_count) || 0;
        return {
          ...item,
          total_usage: pCount + mCount
        };
      });

      let filteredItems = [];

      if (type === "most_worn") {
        const wornOnly = combinedData.filter(i => i.total_usage > 0);
        if (wornOnly.length > 0) {
          // Sabse bada count dhundo
          const maxCount = Math.max(...wornOnly.map(i => i.total_usage));
          // Sirf wahi items uthao jinka count maxCount hai aur latest (ID) sort karo
          filteredItems = wornOnly
            .filter(i => i.total_usage === maxCount)
            .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
        }
      }
      else if (type === "least_worn") {
        const wornOnly = combinedData.filter(i => i.total_usage > 0);
        if (wornOnly.length > 0) {
          // Sabse chota count dhundo
          const minCount = Math.min(...wornOnly.map(i => i.total_usage));
          const maxCount = Math.max(...wornOnly.map(i => i.total_usage));

          // Rule: Agar max aur min same nahi hain, tabhi least worn dikhao (aapka purana logic)
          if (minCount !== maxCount) {
            filteredItems = wornOnly
              .filter(i => i.total_usage === minCount)
              .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
          }
        }
      }
      else if (type === "never_worn") {
        filteredItems = combinedData.filter(i => i.total_usage === 0);
      }

      // 4. Formatting (Bina structure chade)
      const processedItems = filteredItems.map((item) => ({
        _id: item._id,
        title: item.name,
        price: item.price,
        image: item.images?.length > 0
          ? `${process.env.BASE_URL}/uploads/items/${item.images[0]}`
          : `${process.env.BASE_URL}/configs/default/default.png`,
        usage_count: item.total_usage,
      }));

      // Closet average value
      let average_closet_value = 0;
      if (processedItems.length > 0) {
        const totalValue = processedItems.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0);
        average_closet_value = totalValue / processedItems.length;
      }

      return global.successResponse(res, "Wardrobe insights retrieved successfully", {
        items: processedItems,
        total_count: processedItems.length,
        type,
        average_closet_value: parseFloat(average_closet_value.toFixed(2))
      });

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getLatestPosts: async (req, res) => {
    try {
      const userId = req.user._id;

      // Get all post IDs that the logged-in user has reported
      const reportedPosts = await ReportedPosts.find({ user_id: userId }).select("post_id").lean();
      const reportedPostIds = reportedPosts
        .map(rp => rp.post_id)
        .filter(id => id && ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      // Get all users that the logged-in user has blocked
      const currentUser = await UserModel.findById(userId).select("blocked_users").lean();
      const blockedUsers = currentUser?.blocked_users || [];
      const userObjectId = new ObjectId(userId);

      const latestPosts = await posts
        .aggregate([
          {
            $match: {
              _id: { $nin: reportedPostIds },
              createdBy: { $nin: blockedUsers },
            }
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $limit: 2
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
                            $in: [userObjectId, { $ifNull: ["$creatorDoc.followers_users", []] }],
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
                            $in: [userObjectId, { $ifNull: ["$creatorDoc.followers_users", []] }],
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
          // Lookup users who liked the post
          {
            $lookup: {
              from: "users",
              localField: "likes",
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
              as: "likedBy",
            },
          },
          // Lookup lookbook entries for each post
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
          // Unwind comments to populate user details
          {
            $unwind: {
              path: "$comments",
              preserveNullAndEmptyArrays: true
            }
          },
          // Lookup user details for each comment (only if comment exists)
          {
            $lookup: {
              from: "users",
              localField: "comments.userId",
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
              as: "comments.userDetails",
            },
          },
          // Group back to restore comments array
          {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              caption: { $first: "$caption" },
              collaborate: { $first: "$collaborate" },
              videos: { $first: "$videos" },
              images: { $first: "$images" },
              tags: { $first: "$tags" },
              location: { $first: "$location" },
              hideLikes: { $first: "$hideLikes" },
              hideComments: { $first: "$hideComments" },
              turnOffComments: { $first: "$turnOffComments" },
              createdBy: { $first: "$createdBy" },
              likedBy: { $first: "$likedBy" },
              likes: { $first: "$likes" },
              lookbookEntries: { $first: "$lookbookEntries" },
              creatorDoc: { $first: "$creatorDoc" },
              createdAt: { $first: "$createdAt" },
              updatedAt: { $first: "$updatedAt" },
              comments: {
                $push: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$comments", null] },
                        { $ne: ["$comments._id", null] },
                        { $ne: [{ $type: "$comments._id" }, "missing"] }
                      ]
                    },
                    then: {
                      _id: "$comments._id",
                      userId: "$comments.userId",
                      comment: "$comments.comment",
                      createdAt: "$comments.createdAt",
                      updatedAt: "$comments.updatedAt",
                      user: { $arrayElemAt: ["$comments.userDetails", 0] }
                    },
                    else: "$$REMOVE"
                  }
                }
              }
            }
          },
          // Re-sort after grouping to ensure consistent order
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          // $lookup leaves createdBy as an array; assign via $mergeObjects so it
          // becomes a plain object (document literal on an array field would not).
          {
            $addFields: {
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
            },
          },
          {
            $project: {
              _id: 1,
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
              likesCount: { $size: { $ifNull: ["$likes", []] } },
              commentsCount: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$comments", []] },
                    as: "comment",
                    cond: {
                      $and: [
                        { $ne: ["$$comment", null] },
                        { $ne: ["$$comment", {}] },
                        { $ne: [{ $type: "$$comment._id" }, "missing"] },
                        { $ne: ["$$comment._id", null] }
                      ]
                    }
                  }
                }
              },
              createdBy: 1,
              likedBy: 1,
              likes: 1,
              // Users who added this post to lookbook (IDs)
              lookbookBy: {
                $map: {
                  input: { $ifNull: ["$lookbookEntries", []] },
                  as: "lb",
                  in: "$$lb.createdBy",
                },
              },
              comments: {
                $filter: {
                  input: { $ifNull: ["$comments", []] },
                  as: "comment",
                  cond: {
                    $and: [
                      { $ne: ["$$comment", null] },
                      { $ne: ["$$comment", {}] },
                      { $ne: [{ $type: "$$comment._id" }, "missing"] },
                      { $ne: ["$$comment._id", null] }
                    ]
                  }
                }
              },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ])
        .exec();

      // Process images, videos, user profile images, and format response
      const processedPosts = latestPosts.map((post) => {
        const userObjectId = new ObjectId(userId);

        const filteredLikedBy = (post.likedBy || []).filter(
          (user) =>
            user &&
            !blockedUsers.some(
              (bId) => bId && bId.toString() === user._id.toString(),
            ),
        );

        // IDs of users who liked the post (excluding blocked users)
        const likesArray = (post.likes || []).filter(
          (id) =>
            id &&
            !blockedUsers.some(
              (bId) => bId && bId.toString() === id.toString(),
            ),
        );

        const isLiked = likesArray.some(
          (id) => id && id.toString() === userObjectId.toString(),
        );

        const lookbookBy = post.lookbookBy || [];
        const isLookBook = lookbookBy.some(
          (id) => id && id.toString() === userObjectId.toString(),
        );

        const creator = Array.isArray(post.createdBy)
          ? post.createdBy[0]
          : post.createdBy;

        const processedPost = {
          ...post,
          images: global.buildUploadUrls(post.images || []),
          videos: global.buildUploadUrls(post.videos || []),
          createdBy: creator ? {
            _id: creator._id,
            name: creator.full_name || creator.name || creator.username,
            first_name: creator.first_name,
            last_name: creator.last_name,
            full_name: creator.full_name,
            fullName: creator.fullName || creator.full_name,
            username: creator.username,
            profile_image: global.buildUserImageUrl(creator.profile_image),
          } : null,
          likedBy: filteredLikedBy.map(user => ({
            _id: user._id,
            name: user.full_name || user.name || user.username,
            username: user.username,
            profile_image: global.buildUserImageUrl(user.profile_image),
          })),
          // Raw list of user IDs who liked the post (without blocked users)
          likes: likesArray,
          isLiked,
          // Lookbook info
          lookbookBy,
          isLookBook,
          comments: (post.comments || []).filter(comment => comment && comment._id).map(comment => ({
            _id: comment._id,
            comment: comment.comment,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            user: comment.user ? {
              _id: comment.user._id,
              name: comment.user.full_name || comment.user.name || comment.user.username,
              username: comment.user.username,
              profile_image: global.buildUserImageUrl(comment.user.profile_image),
            } : null,
          })),
        };
        return global.applyPostHideFlags(processedPost, userId);
      });

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        posts: processedPosts,
        total_count: processedPosts.length,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getWardrobeDashboardStats: async (req, res) => {
    try {
      const userId = req.user._id;

      // Calculate total price of all items for the logged-in user
      const totalPriceResult = await items.aggregate([
        {
          $match: {
            createdBy: new ObjectId(userId),
            status: ACTIVE
          }
        },
        {
          $group: {
            _id: null,
            totalPrice: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$price", null] }, { $ne: [{ $type: "$price" }, "missing"] }] },
                  { $toDouble: "$price" },
                  0
                ]
              }
            },
            totalItems: { $sum: 1 }
          }
        }
      ]);

      const totalPrice = totalPriceResult.length > 0 ? totalPriceResult[0].totalPrice : 0;
      const totalItems = totalPriceResult.length > 0 ? totalPriceResult[0].totalItems : 0;

      // Get outfit count for the user
      const outfitCount = await outfits.countDocuments({
        createdBy: new ObjectId(userId),
        status: ACTIVE
      });

      // Get all unique items from outfits and calculate their total price
      // This ensures if same item is in multiple outfits, price is counted only once
      const uniqueItemsResult = await outfits.aggregate([
        {
          $match: {
            createdBy: new ObjectId(userId),
            status: ACTIVE,
            item_id: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: "$item_id"
        },
        {
          $group: {
            _id: "$item_id"
          }
        },
        {
          $lookup: {
            from: "items",
            localField: "_id",
            foreignField: "_id",
            as: "itemDetails"
          }
        },
        {
          $unwind: "$itemDetails"
        },
        {
          $match: {
            "itemDetails.status": ACTIVE,
            "itemDetails.createdBy": new ObjectId(userId)
          }
        },
        {
          $group: {
            _id: null,
            outfitTotalPrice: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$itemDetails.price", null] },
                      { $ne: [{ $type: "$itemDetails.price" }, "missing"] }
                    ]
                  },
                  { $toDouble: "$itemDetails.price" },
                  0
                ]
              }
            },
            uniqueItemsCount: { $sum: 1 }
          }
        }
      ]);

      const outfitTotalPrice = uniqueItemsResult.length > 0 ? uniqueItemsResult[0].outfitTotalPrice : 0;
      const uniqueItemsCount = uniqueItemsResult.length > 0 ? uniqueItemsResult[0].uniqueItemsCount : 0;

      // Get footwear and accessories category IDs (case-insensitive match)
      const footwearCategory = await Category.findOne({
        title: { $regex: /footwear/i },
        status: ACTIVE
      });
      const accessoriesCategory = await Category.findOne({
        title: { $regex: /accessories/i },
        status: ACTIVE
      });

      // Count footwear items
      let footwearCount = 0;
      if (footwearCategory) {
        footwearCount = await items.countDocuments({
          createdBy: new ObjectId(userId),
          category: footwearCategory._id,
          status: ACTIVE
        });
      }

      // Count accessories items
      let accessoriesCount = 0;
      if (accessoriesCategory) {
        accessoriesCount = await items.countDocuments({
          createdBy: new ObjectId(userId),
          category: accessoriesCategory._id,
          status: ACTIVE
        });
      }

      return global.successResponse(res, "Operation successfully", {
        totalPrice: totalPrice,
        totalItems: totalItems,
        // outfitCount: outfitCount,
        // outfitTotalPrice: outfitTotalPrice,
        // uniqueItemsInOutfits: uniqueItemsCount,
        // footwearCount: footwearCount,
        // accessoriesCount: accessoriesCount
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  }
};

export default DashboardController;
