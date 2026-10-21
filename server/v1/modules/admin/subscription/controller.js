import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
// models
import subscription from "../../../../../models/subscription.js";

const SubscriptionController = {
  save: async (req, res) => {
    try {
      const {
        title,
        price,
        description,
        status,
        duration_type,
        subscription_access,
        benefits
      } = req.body;

      const userId = req.user?._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!title || !title.trim()) {
        return global.failResponse(res, global.msg(req, res, "label_title_error"), {});
      }

      const formattedTitle = global.capitalizeFirstLetter(title.trim());

      const existingItem = await subscription.findOne({ title: formattedTitle });
      if (existingItem) {
        return global.failResponse(
          res,
          global.msg(req, res, "item_title_already_used"),
          {}
        );
      }

      const parseJsonArray = (value, fallback = []) => {
        if (value === undefined || value === null || value === "") return fallback;
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : fallback;
          } catch (e) {
            return fallback;
          }
        }
        return fallback;
      };

      const parsedSubscriptionAccess = parseJsonArray(subscription_access, []);
      const parsedBenefits = parseJsonArray(benefits, undefined);

      const itemData = {
        title: formattedTitle,
        price,
        description,
        duration_type,
        status,
        user_id: userId,
        createdBy: userId,
      };

      if (price !== undefined) itemData.price = price;
      if (description !== undefined) itemData.description = description;
      if (duration_type !== undefined) itemData.duration_type = duration_type;

      if (subscription_access !== undefined) {
        itemData.subscription_access = parsedSubscriptionAccess
          .map((row) => ({
            slug: (row?.slug || "").toString().trim(),
            key: (row?.key || "").toString().trim(),
            label: (row?.label || "").toString().trim(),
            value: (row?.value || "").toString().trim(),
          }))
          .filter((row) => row.slug || row.key || row.label || row.value);
      }

      if (benefits !== undefined) {
        itemData.benefits = (parsedBenefits || [])
          .map((b) => (b || "").toString().trim())
          .filter(Boolean);
      }
      const newItem = await subscription.create(itemData);

      return global.successResponse(
        res,
        global.msgByReq(req, "subscription_added_success"),
        { subscription: newItem }
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  details: (req, res) => {
    const { o_id } = req.query;

    subscription
      .aggregate([
        {
          $match: { _id: new ObjectId(o_id) }
        },
        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),

        {
          $project: {
            title: 1,
            description: 1,
            benefits: 1,
            status: 1,
            price: 1,
            subscription_access: 1,
            duration_type: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ])
      .exec()
      .then((result) => {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result[0] || {});
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  edit: async (req, res) => {
    try {
      const {
        o_id,
        title,
        price,
        description,
        duration_type,
        status,
        subscription_access,
        benefits
      } = req.body;

      const userId = req.user?._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid subscription ID", {});
      }

      if (!title || !title.trim()) {
        return global.failResponse(res, global.msg(req, res, "label_title_error"), {});
      }

      const formattedTitle = global.capitalizeFirstLetter(title.trim());

      const existingItem = await subscription.findOne({
        title: formattedTitle,
        _id: { $ne: new ObjectId(o_id) },
      });

      if (existingItem) {
        return global.failResponse(
          res,
          global.msg(req, res, "item_title_already_used"),
          {}
        );
      }

      const parseJsonArray = (value, fallback = []) => {
        if (value === undefined || value === null || value === "") return fallback;
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : fallback;
          } catch (e) {
            return fallback;
          }
        }
        return fallback;
      };

      const parsedSubscriptionAccess = parseJsonArray(subscription_access, []);
      const parsedBenefits = parseJsonArray(benefits, []);

      const updateData = {
        title: formattedTitle,
        duration_type,
        status,
        updatedBy: userId,
      };

      if (price !== undefined) updateData.price = price;
      if (description !== undefined) updateData.description = description;

      if (subscription_access !== undefined) {
        updateData.subscription_access = parsedSubscriptionAccess
          .map((row) => ({
            slug: (row?.slug || "").toString().trim(),
            key: (row?.key || "").toString().trim(),
            label: (row?.label || "").toString().trim(),
            value: (row?.value || "").toString().trim(),
          }))
          .filter((row) => row.slug || row.key || row.label || row.value);
      }

      if (benefits !== undefined) {
        updateData.benefits = (parsedBenefits || [])
          .map((b) => (b || "").toString().trim())
          .filter(Boolean);
      }

      const result = await subscription.updateOne(
        { _id: new ObjectId(o_id) },
        { $set: updateData }
      );

      return global.successResponse(
        res,
        global.msg(req, res, "subscription_updated_success"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  list: async (req, res) => {
    const globalSearch = ["title"];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    let json = {


      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    let sorting = await global.getSorting(req);

    async.parallel(
      {
        list: (callback) => {
          subscription
            .aggregate([
              { $match: json },
              { $sort: sorting },
              { $skip: skip },
              { $limit: perPage },

              {
                $project: {
                  title: 1,
                  description: 1,
                  benefits: 1,
                  status: 1,
                  price: 1,
                  subscription_access: 1,
                  createdAt: 1,
                },
              },
            ])
            .exec()
            .then((result) => callback(null, result))
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          subscription
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

  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    subscription.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"));
      })
      .catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },


  delete: async (req, res) => {
    const { o_id } = req.query;
    const OutfitId = new ObjectId(o_id);

    try {
      await subscription.deleteOne({ _id: OutfitId });

      return global.successResponse(res, global.msg(req, res, "post_deleted_success"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default SubscriptionController;
