import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

// models
import IapTransaction from "../../../../../models/iap-transaction.js";

const IapTransactionController = {
  /**
   * List all IAP transactions with pagination, search, sorting
   * POST /v1/admin/iapTransactionManagement/list
   */
  list: async (req, res) => {
    try {
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;

      // Base filters on IapTransaction fields (event_type, platform, status, date range etc.)
      let baseMatch = {
        ...global.getFilter(req),
      };

      // Handle search object fields that live on IapTransaction itself
      const searching = global.getSearching(req, []);
      const { $or: _ignored, ...transactionFilters } = searching;
      Object.assign(baseMatch, transactionFilters);

      // Build cross-collection $or for global_search
      // Searches: product_id, transaction_id, event_type + user email/name
      let globalSearchStage = null;
      if (req.body.global_search && req.body.global_search.trim()) {
        const text = req.body.global_search.trim();
        globalSearchStage = {
          $match: {
            $or: [
              { product_id: { $regex: text, $options: "i" } },
              { transaction_id: { $regex: text, $options: "i" } },
              { order_id: { $regex: text, $options: "i" } },
              { event_type: { $regex: text, $options: "i" } },
              { "user.email": { $regex: text, $options: "i" } },
              { "user.full_name": { $regex: text, $options: "i" } },
              { "user.first_name": { $regex: text, $options: "i" } },
              { "user.last_name": { $regex: text, $options: "i" } },
            ],
          },
        };
      }

      let sorting = await global.getSorting(req);

      // Build shared pipeline
      const buildPipeline = (withPagination) => {
        const pipeline = [
          // 1. Filter on IapTransaction fields first (uses indexes)
          { $match: baseMatch },

          // 2. Lookup user details
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: {
              path: "$user",
              preserveNullAndEmptyArrays: true,
            },
          },

          // 3. Lookup subscription plan
          {
            $lookup: {
              from: "subscriptions",
              localField: "subscription_id",
              foreignField: "_id",
              as: "subscription_plan",
            },
          },
          {
            $unwind: {
              path: "$subscription_plan",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        // 4. Apply cross-collection search after lookups
        if (globalSearchStage) {
          pipeline.push(globalSearchStage);
        }

        if (withPagination) {
          pipeline.push(
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },
            {
              $project: {
                _id: 1,
                platform: 1,
                product_id: 1,
                transaction_id: 1,
                original_transaction_id: 1,
                purchase_token: 1,
                order_id: 1,
                event_type: 1,
                source: 1,
                paid_amount: 1,
                currency: 1,
                purchase_date: 1,
                expires_date: 1,
                environment: 1,
                notification_type: 1,
                notification_subtype: 1,
                createdAt: 1,
                updatedAt: 1,
                // user info
                "user._id": 1,
                "user.full_name": 1,
                "user.first_name": 1,
                "user.last_name": 1,
                "user.email": 1,
                "user.phone_number": 1,
                "user.countryCode": 1,
                "user.profile_image": 1,
                "user.status": 1,
                // plan info
                "subscription_plan._id": 1,
                "subscription_plan.title": 1,
                "subscription_plan.duration_type": 1,
                "subscription_plan.price": 1,
              },
            }
          );
        } else {
          pipeline.push({ $count: "total" });
        }

        return pipeline;
      };

      async.parallel(
        {
          list: (callback) => {
            IapTransaction.aggregate(buildPipeline(true))
              .exec()
              .then((result) => {
                result = result.map((row) => {
                  if (row.user && row.user.profile_image) {
                    row.user.profile_image = global.buildUserImageUrl(row.user.profile_image);
                  }
                  return row;
                });
                callback(null, result);
              })
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            IapTransaction.aggregate(buildPipeline(false))
              .exec()
              .then((result) => callback(null, result[0]?.total || 0))
              .catch((err) => callback(err));
          },

          page: (cb) => cb(null, page),
          per_page: (cb) => cb(null, perPage),
          offset: (cb) => cb(null, skip),
        },
        (err, result) => {
          if (err) {
            return global.failResponse(res, err.message, err);
          }
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
        }
      );
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },

  /**
   * Get single IAP transaction details
   * GET /v1/admin/iapTransactionManagement/details?o_id=...
   */
  details: (req, res) => {
    const { o_id } = req.query;

    IapTransaction.aggregate([
      { $match: { _id: new ObjectId(o_id) } },

      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup subscription plan
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription_id",
          foreignField: "_id",
          as: "subscription_plan",
        },
      },
      {
        $unwind: {
          path: "$subscription_plan",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup user_subscription record
      {
        $lookup: {
          from: "usersubscriptions",
          localField: "user_subscription_id",
          foreignField: "_id",
          as: "user_subscription",
        },
      },
      {
        $unwind: {
          path: "$user_subscription",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          platform: 1,
          product_id: 1,
          transaction_id: 1,
          original_transaction_id: 1,
          purchase_token: 1,
          order_id: 1,
          event_type: 1,
          source: 1,
          paid_amount: 1,
          currency: 1,
          purchase_date: 1,
          expires_date: 1,
          environment: 1,
          notification_type: 1,
          notification_subtype: 1,
          raw_transaction: 1,
          createdAt: 1,
          updatedAt: 1,
          // user info
          "user._id": 1,
          "user.full_name": 1,
          "user.first_name": 1,
          "user.middle_name": 1,
          "user.last_name": 1,
          "user.username": 1,
          "user.email": 1,
          "user.phone_number": 1,
          "user.countryCode": 1,
          "user.DOB": 1,
          "user.gender": 1,
          "user.profile_image": 1,
          "user.accountProvider": 1,
          "user.is_email_verified": 1,
          "user.status": 1,
          "user.createdAt": 1,
          // plan info
          "subscription_plan._id": 1,
          "subscription_plan.title": 1,
          "subscription_plan.description": 1,
          "subscription_plan.price": 1,
          "subscription_plan.duration_type": 1,
          "subscription_plan.product_id": 1,
          "subscription_plan.benefits": 1,
          "subscription_plan.subscription_access": 1,
          "subscription_plan.status": 1,
          // user subscription record
          "user_subscription._id": 1,
          "user_subscription.title": 1,
          "user_subscription.price": 1,
          "user_subscription.start_date": 1,
          "user_subscription.end_date": 1,
          "user_subscription.status": 1,
          "user_subscription.activated": 1,
          "user_subscription.platform": 1,
          "user_subscription.verified": 1,
        },
      },
    ])
      .exec()
      .then((result) => {
        if (result.length > 0) {
          let record = result[0];
          if (record.user && record.user.profile_image) {
            record.user.profile_image = global.buildUserImageUrl(record.user.profile_image);
          }
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, record);
        } else {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },
};

export default IapTransactionController;
