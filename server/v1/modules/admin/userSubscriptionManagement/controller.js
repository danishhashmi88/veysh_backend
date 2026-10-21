import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

// models
import UserSubscription from "../../../../../models/user-subscription.js";
import Subscription from "../../../../../models/subscription.js";

const UserSubscriptionController = {
  /**
   * List all user subscriptions with pagination, search, sorting
   * POST /v1/admin/userSubscriptionManagement/list
   */
  list: async (req, res) => {
    try {
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;

      // Base filters (status, date range, etc.) — no global_search here
      // because user.email / user.full_name are only available after $lookup
      let baseMatch = {
        ...global.getFilter(req),
      };

      // Handle search object fields that live on UserSubscription itself (e.g. title, status, createdAt)
      const searching = global.getSearching(req, []);
      // Remove $or from searching since we'll build our own cross-collection $or below
      const { $or: _ignored, ...subscriptionFilters } = searching;
      Object.assign(baseMatch, subscriptionFilters);

      // Build cross-collection $or for global_search (title + user.email + user.full_name)
      let globalSearchStage = null;
      if (req.body.global_search && req.body.global_search.trim()) {
        const text = req.body.global_search.trim();
        globalSearchStage = {
          $match: {
            $or: [
              { title: { $regex: text, $options: "i" } },
              { "user.email": { $regex: text, $options: "i" } },
              { "user.full_name": { $regex: text, $options: "i" } },
              { "user.first_name": { $regex: text, $options: "i" } },
              { "user.last_name": { $regex: text, $options: "i" } },
            ],
          },
        };
      }

      let sorting = await global.getSorting(req);

      // Build shared pipeline up to (and including) the post-lookup search match
      const buildPipeline = (withPagination) => {
        const pipeline = [
          // 1. Filter on UserSubscription fields first (fast — uses indexes)
          { $match: baseMatch },

          // 2. Lookup user so we can search on user.email / user.full_name
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
                title: 1,
                price: 1,
                duration_type: 1,
                start_date: 1,
                end_date: 1,
                paid_amount: 1,
                credit_amount: 1,
                status: 1,
                platform: 1,
                product_id: 1,
                activated: 1,
                verified: 1,
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
          // For count: just count after search filter
          pipeline.push({ $count: "total" });
        }

        return pipeline;
      };

      async.parallel(
        {
          list: (callback) => {
            UserSubscription.aggregate(buildPipeline(true))
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
            UserSubscription.aggregate(buildPipeline(false))
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
   * Get single user subscription details
   * GET /v1/admin/userSubscriptionManagement/details?o_id=...
   */
  details: (req, res) => {
    const { o_id } = req.query;

    UserSubscription.aggregate([
      { $match: { _id: new ObjectId(o_id) } },

      // join user details
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

      // join subscription plan details
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

      {
        $project: {
          _id: 1,
          title: 1,
          price: 1,
          duration_type: 1,
          start_date: 1,
          end_date: 1,
          paid_amount: 1,
          credit_amount: 1,
          status: 1,
          platform: 1,
          product_id: 1,
          transaction_id: 1,
          original_transaction_id: 1,
          purchase_token: 1,
          order_id: 1,
          subscription_state: 1,
          acknowledgement_state: 1,
          verified: 1,
          verified_at: 1,
          activated: 1,
          subscription_access: 1,
          benefits: 1,
          description: 1,
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
        },
      },
    ])
      .exec()
      .then((result) => {
        if (result.length > 0) {
          let record = result[0];
          // build profile image url
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

export default UserSubscriptionController;
