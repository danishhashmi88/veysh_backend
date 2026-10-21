import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { ACTIVE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

import items from "../../../../../models/items.js";
import outfits from "../../../../../models/outfit.js";
import Category from "../../../../../models/category.js";
// import { syncWearCountFromPastEvents } from "../../../../../helpers/wear-count-sync.js";
// import Category from "../../../../../models/category.js";

const ClosetInsightController = {
  getClosetInsightStats: async (req, res) => {
    try {
      const userId = new ObjectId(req.user._id);

      // 1. BASIC STATS
      const total_clothing = await items.countDocuments({ createdBy: userId });
      const basicStats = await items.aggregate([
        { $match: { createdBy: userId } },
        {
          $group: {
            _id: null,
            totalPrice: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$price", null] }, { $ne: ["$price", ""] }] },
                  { $toDouble: { $ifNull: ["$price", 0] } },
                  0
                ]
              }
            }
          }
        }
      ]);
      const total_closet_value = basicStats.length > 0 ? Number((basicStats[0].totalPrice || 0).toFixed(2)) : 0;
      // const average_closet_value = total_clothing > 0 ? total_closet_value / total_clothing : 0;
      const total_outfit = await outfits.countDocuments({ createdBy: userId });

      // 2. TOTAL OUTFIT VALUE
      const uniqueOutfitItems = await outfits.aggregate([
        { $match: { createdBy: userId, status: ACTIVE, item_id: { $exists: true, $ne: [] } } },
        { $unwind: "$item_id" },
        { $group: { _id: { $toObjectId: "$item_id" } } },
        { $lookup: { from: "items", localField: "_id", foreignField: "_id", as: "details" } },
        { $unwind: "$details" },
        { $match: { "details.status": ACTIVE } },
        { $group: { _id: null, totalVal: { $sum: { $toDouble: { $ifNull: ["$details.price", 0] } } } } }
      ]);
      const total_outfit_value = uniqueOutfitItems.length > 0 ? Number((uniqueOutfitItems[0].totalVal || 0).toFixed(2)) : 0;

      // 3. MONTHLY CHARTS (6 Months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const monthlyData = await items.aggregate([
        { $match: { createdBy: userId, status: ACTIVE, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            count: { $sum: 1 },
            spend: { $sum: { $toDouble: { $ifNull: ["$price", 0] } } }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      const monthlyOutfits = await outfits.aggregate([
        { $match: { createdBy: userId, status: ACTIVE, createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      // 4. USAGE LOGIC
      // NOTE: Event-based wear sync intentionally disabled.
      // Most worn / least worn / never worn now rely only on item.wear_count.
      // await syncWearCountFromPastEvents(userId);

      const allItems = await items.find({ createdBy: userId, status: ACTIVE }).populate('category').lean();
      // console.log("allItems", allItems)
      const finalItems = allItems.map(i => {
        const total = Number(i.wear_count) || 0;
        return { ...i, totalWear: total };
      });
      const totalCostPerWear = finalItems.reduce((sum, item) => {
        const costPerWear = Number(item.cost_per_wear) || 0;
        return sum + costPerWear;
      }, 0);
      const average_closet_value =
        finalItems.length > 0 ? Number((totalCostPerWear / finalItems.length).toFixed(2)) : 0;

      // console.log("average_closet_value", average_closet_value);

      const wornItems = finalItems.filter(i => i.totalWear > 0);

      let topMostWorn = [], topLeastWorn = [];

      if (wornItems.length > 0) {
        const sortByLatest = (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

        // MOST WORN: all items sharing highest wear count, latest 5 only
        const maxCount = Math.max(...wornItems.map((item) => item.totalWear));
        topMostWorn = wornItems
          .filter((item) => item.totalWear === maxCount)
          .sort(sortByLatest)
          .slice(0, 5);

        // LEAST WORN: choose from worn items excluding the highest bucket
        const leastCandidates = wornItems.filter((item) => item.totalWear < maxCount);
        if (leastCandidates.length > 0) {
          const minCount = Math.min(...leastCandidates.map((item) => item.totalWear));
          topLeastWorn = leastCandidates
            .filter((item) => item.totalWear === minCount)
            .sort(sortByLatest)
            .slice(0, 5);
        }
      }

      const neverWornItems = finalItems
        .filter((item) => item.totalWear === 0)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

      const fmt = (item) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        images: item.images?.length > 0 ? item.images.map(img => `${process.env.BASE_URL}/uploads/items/${img}`) : [`${process.env.BASE_URL}/configs/default/default.png`],
        category: item.category?.title || "Others",
        wearCount: item.totalWear
      });

      // 5. MOST WORN CATEGORY
      const catMap = {};
      finalItems.forEach(i => {
        const categoryName = i.category?.title || "Others";
        if (i.totalWear > 0) {
          catMap[categoryName] = (catMap[categoryName] || 0) + i.totalWear;
        }
      });
      const mostWornCategory = Object.entries(catMap).map(([name, totalWearCount]) => ({ name, totalWearCount })).sort((a, b) => b.totalWearCount - a.totalWearCount).slice(0, 5);

      // 6. COMPOSITION
      const closetComposition = await items.aggregate([
        { $match: { createdBy: userId, status: ACTIVE } },
        { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "cat" } },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        { $group: { _id: { $ifNull: ["$cat.title", "Others"] }, count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]);
      const brandOwnership = await items.aggregate([
        {
          $match: {
            createdBy: userId,
            status: ACTIVE,
            brand_name: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: { $trim: { input: "$brand_name" } },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            _id: { $nin: ["", "none", "None", "NONE", "null", "Null", "NULL"] },
          },
        },
        { $project: { brand_name: "$_id", totalCount: "$count", _id: 0 } },
        { $sort: { totalCount: -1, brand_name: 1 } },
        { $limit: 5 },
      ]);
      const mostOwnedBrand = brandOwnership.map((row) => ({
        brand_name: row.brand_name,
        totalCount: row.totalCount || 0,
      }));

      return global.successResponse(res, "Stats retrieved successfully", {
        total_clothing, total_closet_value, average_closet_value, total_outfit, total_outfit_value, closetComposition,
        // average_cost_per_wear,
        closet_growth: monthlyData.map(d => ({ month: months[d._id.month - 1], count: d.count })),
        outfit_frequency: monthlyOutfits.map(d => ({ month: months[d._id.month - 1], count: d.count })),
        monthly_closet_spend: monthlyData.map(d => ({
          month: months[d._id.month - 1],
          spend: Number((d.spend || 0).toFixed(2))
        })),
        mostWornItems: topMostWorn.map(fmt),
        leastWornItems: topLeastWorn.map(fmt),
        neverWornItems: neverWornItems.map(fmt),
        mostWornCategory,
        mostOwnedBrand
      });

    } catch (err) {
      return global.failResponse(res, err.message);
    }
  }
};

export default ClosetInsightController;
