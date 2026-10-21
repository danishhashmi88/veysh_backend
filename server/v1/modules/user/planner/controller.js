import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { MESSAGE, PER_PAGE_RECORDS } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

// models
import planner from "../../../../../models/planner.js";
const { log } = async;
function normalizePlannerItemIds(item_id) {
  if (item_id === undefined || item_id === null || item_id === "") {
    return [];
  }
  const raw = Array.isArray(item_id) ? item_id : [item_id];
  return raw.filter((id) => id != null && id !== "").map((id) => new ObjectId(id));
}

function mapItemImageUrls(doc) {
  if (!doc || !Array.isArray(doc.images)) return;
  doc.images = doc.images.map((p) => {
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const cleanPath = p.startsWith("/") ? p.slice(1) : p;
    return `${process.env.BASE_URL}/uploads/items/${cleanPath}`;
  });
}

const PlannerController = {
  save: async (req, res) => {
    try {
      const { name, event_date, event_time, notes, outfit_id, remind_me_1day_before, remind_me_2hours_before, remind_me_2day_before, item_id } = req.body;
      console.log("[Planner] save req.body:", JSON.stringify(req.body, null, 2));
      const userId = req.user._id;

      const formattedTitle = global.capitalizeFirstLetter(name.trim());

      const existingItem = await planner.findOne({
        name: formattedTitle,
        createdBy: userId,
      });

      if (existingItem) {
        return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
      }
      const eventDateUTC = new Date(Date.UTC(new Date(event_date).getFullYear(), new Date(event_date).getMonth(), new Date(event_date).getDate(), 0, 0, 0, 0));

      let itemData = {
        name: global.capitalizeFirstLetter(name),
        event_date: eventDateUTC,
        event_time,
        notes,
        outfit_id,
        item_id: normalizePlannerItemIds(item_id),
        remind_me_1day_before,
        remind_me_2hours_before,
        remind_me_2day_before,
        createdBy: userId,
        updatedBy: userId,
      };


      const newItem = await planner.create(itemData);
      return global.successResponse(res, global.msgByReq(req, "planner_added_success"), { planner: newItem });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  edit: async (req, res) => {
    try {
      const {
        o_id,
        name,
        event_date,
        event_time,
        notes,
        outfit_id,
        remind_me_1day_before,
        remind_me_2hours_before,
        remind_me_2day_before,
        item_id
      } = req.body;

      const userId = req.user._id;
      console.log("[Planner] edit req.body:", JSON.stringify(req.body, null, 2));

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      let updateData = {};

      if (name !== undefined) {
        const formattedTitle = global.capitalizeFirstLetter(name.trim());

        const duplicate = await planner.findOne({
          name: formattedTitle,
          createdBy: userId,
          _id: { $ne: new ObjectId(o_id) },
        });

        if (duplicate) {
          return global.failResponse(res, global.msg(req, res, "item_title_already_used"), {});
        }

        updateData.name = formattedTitle;
      }

      if (event_date !== undefined) {
        const d = new Date(event_date);
        updateData.event_date = new Date(
          Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
        );
        updateData.notified_2hours = false;
        updateData.notified_1day = false;
        updateData.notified_2day = false;
      }

      if (event_time !== undefined) {
        updateData.event_time = event_time;
        updateData.notified_2hours = false;
        updateData.notified_1day = false;
        updateData.notified_2day = false;
      }

      if (event_time !== undefined) updateData.event_time = event_time;
      if (notes !== undefined) updateData.notes = notes;
      if (outfit_id !== undefined) {
        updateData.outfit_id = outfit_id ? new ObjectId(outfit_id) : null;
      }

      if (item_id !== undefined) {
        updateData.item_id = normalizePlannerItemIds(item_id);
      }
      if (remind_me_1day_before !== undefined)
        updateData.remind_me_1day_before =
          remind_me_1day_before === "true" || remind_me_1day_before === true;
      if (remind_me_2hours_before !== undefined)
        updateData.remind_me_2hours_before =
          remind_me_2hours_before === "true" || remind_me_2hours_before === true;
      if (remind_me_2day_before !== undefined)
        updateData.remind_me_2day_before =
          remind_me_2day_before === "true" || remind_me_2day_before === true;

      updateData.updatedBy = userId;

      const updatedPlanner = await planner.findOneAndUpdate(
        {
          _id: new ObjectId(o_id),
          createdBy: new ObjectId(userId),
        },
        { $set: updateData },
        { new: true },
      );


      if (!updatedPlanner) {
        return global.failResponse(res, "Planner not found", {});
      }

      return global.successResponse(
        res,
        global.msgByReq(req, "msg_planner_updated_success"),
        { planner: updatedPlanner }
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  details: (req, res) => {
    const { o_id } = req.query;

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid item ID", {});
    }

    planner
      .aggregate([
        {
          $match: {
            _id: new ObjectId(o_id),
            createdBy: new ObjectId(req.user._id),
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
        {
          $lookup: {
            from: "items",
            localField: "item_id",
            foreignField: "_id",
            as: "item",
          },
        },
        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),

        {
          $project: {
            name: 1,
            event_date: 1,
            event_time: 1,
            notes: 1,
            status: 1,
            outfit_id: 1,
            item_id: 1,
            remind_me_1day_before: 1,
            remind_me_2hours_before: 1,
            remind_me_2day_before: 1,
            outfit: { $arrayElemAt: ["$outfit", 0] },
            items: "$item",
            item: { $arrayElemAt: ["$item", 0] },
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
        if (item.outfit && item.outfit.images) {
          item.outfit.images = global.buildUploadUrls(item.outfit.images);
        }
        if (Array.isArray(item.items)) {
          item.items.forEach(mapItemImageUrls);
        }
        if (item.item) {
          mapItemImageUrls(item.item);
        }
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, item);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  list: async (req, res) => {
    try {
      const globalSearch = ["name", "notes"];
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;
      const userId = req.user._id;
      const matchQuery = {
        createdBy: new ObjectId(userId),
        ...global.getSearching(req, globalSearch),
        ...global.getFilter(req),
      };
      // Month range filter (Jan → Nov)
      if (req.body.start_month && req.body.end_month) {
        const currentYear = new Date().getFullYear();
        const year = req.body.year || currentYear;

        const startOfRange = new Date(Date.UTC(year, req.body.start_month - 1, 1));
        const endOfRange = new Date(Date.UTC(year, req.body.end_month, 0, 23, 59, 59, 999));

        matchQuery.event_date = {
          $gte: startOfRange,
          $lte: endOfRange,
        };
      }
      // Single month filter
      else if (req.body.month) {
        let month = req.body.month;
        const currentYear = new Date().getFullYear();
        const year = req.body.year || currentYear;

        if (month === "current") {
          month = new Date().getMonth() + 1;
        }

        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        matchQuery.event_date = {
          $gte: startOfMonth,
          $lte: endOfMonth,
        };
      }


      const sorting = await global.getSorting(req);

      async.parallel(
        {
          list: (callback) => {
            planner
              .aggregate([
                { $match: matchQuery },
                { $sort: sorting },
                { $skip: skip },
                { $limit: perPage },

                {
                  $lookup: {
                    from: "outfits",
                    localField: "outfit_id",
                    foreignField: "_id",
                    as: "outfit",
                  },
                },
                {
                  $lookup: {
                    from: "items",
                    localField: "item_id",
                    foreignField: "_id",
                    as: "item",
                  },
                },
                {
                  $project: {
                    name: 1,
                    event_date: 1,
                    event_time: 1,
                    remind_me_1day_before: 1,
                    remind_me_2hours_before: 1,
                    remind_me_2day_before: 1,
                    notes: 1,
                    status: 1,
                    outfit_id: 1,
                    item_id: 1,
                    createdAt: 1,
                    outfit: { $arrayElemAt: ["$outfit", 0] },
                    items: "$item",
                    item: { $arrayElemAt: ["$item", 0] },
                  },
                },
              ])
              .exec()
              .then((result) => {
                const processedResult = result.map((row) => {
                  if (row.outfit && row.outfit.images) {
                    row.outfit.images = global.buildUploadUrls(row.outfit.images);
                  }
                  if (Array.isArray(row.items)) {
                    row.items.forEach(mapItemImageUrls);
                  }
                  if (row.item) {
                    mapItemImageUrls(row.item);
                  }
                  return row;
                });
                callback(null, processedResult);
              })
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            planner
              .countDocuments(matchQuery)
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
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  todayList: async (req, res) => {
    try {
      const globalSearch = ["name", "notes"];
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;

      const IST_OFFSET = 5.5 * 60 * 60 * 1000;

      const now = new Date();
      const istNow = new Date(now.getTime() + IST_OFFSET);

      const startOfDayIST = new Date(istNow);
      startOfDayIST.setHours(0, 0, 0, 0);

      const endOfDayIST = new Date(istNow);
      endOfDayIST.setHours(23, 59, 59, 999);

      const startOfDayUTC = new Date(startOfDayIST.getTime() - IST_OFFSET);
      const endOfDayUTC = new Date(endOfDayIST.getTime() - IST_OFFSET);

      const userId = req.user._id;
      const matchQuery = {
        createdBy: new ObjectId(userId),
        event_date: {
          $gte: startOfDayUTC,
          $lte: endOfDayUTC,
        },
        ...global.getSearching(req, globalSearch),
        ...global.getFilter(req),
      };

      const sorting = await global.getSorting(req);
      const parseEventTimeToMinutes = (value) => {
        if (!value || typeof value !== "string") return null;
        const t = value.trim();
        const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (m12) {
          let hour = Number(m12[1]);
          const minute = Number(m12[2]);
          const ampm = m12[3].toUpperCase();
          if (ampm === "PM" && hour < 12) hour += 12;
          if (ampm === "AM" && hour === 12) hour = 0;
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
          return null;
        }
        const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
        if (m24) {
          const hour = Number(m24[1]);
          const minute = Number(m24[2]);
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
        }
        return null;
      };

      const nowMinutes = istNow.getHours() * 60 + istNow.getMinutes();

      const rows = await planner
        .aggregate([
          { $match: matchQuery },
          { $sort: sorting },
          {
            $lookup: {
              from: "outfits",
              localField: "outfit_id",
              foreignField: "_id",
              as: "outfit",
            },
          },
          {
            $lookup: {
              from: "items",
              localField: "item_id",
              foreignField: "_id",
              as: "item",
            },
          },
          {
            $project: {
              name: 1,
              event_date: 1,
              event_time: 1,
              notes: 1,
              status: 1,
              outfit_id: 1,
              item_id: 1,
              createdAt: 1,
              outfit: { $arrayElemAt: ["$outfit", 0] },
              items: "$item",
              item: { $arrayElemAt: ["$item", 0] },
            },
          },
        ])
        .exec();

      const processedResult = rows
        .map((row) => {
          if (row.outfit && row.outfit.images) {
            row.outfit.images = global.buildUploadUrls(row.outfit.images);
          }
          if (Array.isArray(row.items)) {
            row.items.forEach(mapItemImageUrls);
          }
          if (row.item) {
            mapItemImageUrls(row.item);
          }
          return row;
        })
        .filter((row) => {
          const eventMinutes = parseEventTimeToMinutes(row.event_time);
          if (eventMinutes === null) return true;
          return eventMinutes >= nowMinutes;
        });

      const result = {
        list: processedResult.slice(skip, skip + perPage),
        total_records: processedResult.length,
        page,
        offset: skip,
        per_page: perPage,
      };

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  delete: async (req, res) => {
    const { o_id } = req.query;
    const OutfitId = new ObjectId(o_id);

    try {
      await planner.deleteOne({
        _id: new ObjectId(o_id),
        createdBy: new ObjectId(req.user._id),
      });


      return global.successResponse(res, global.msg(req, res, "planner_deleted_success"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default PlannerController;
