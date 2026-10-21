import global from "../../../../../helpers/global-functions.js";
import async from "async";

/** Models */
import UserModel from "../../../../../models/users.js";
import ItemsModel from "../../../../../models/items.js";
import OutfitModel from "../../../../../models/outfit.js";
import IapTransaction from "../../../../../models/iap-transaction.js";
import { USER_ROLES, MESSAGE } from "../../../../../global-variable.js";
import posts from "../../../../../models/posts.js";

const dashboardController = {
  getCount: (req, res) => {
    async.parallel(
      {
        users: (callback) => {
          UserModel.countDocuments({ role: "user" })
            .then((result) => {
              callback(null, result);
            })
            .catch((err) => {
              callback(err);
            });
        },
        items: (callback) => {
          // let findJson = {
          //   role: USER_ROLES.USER,
          // };
          ItemsModel.countDocuments()
            .then((result) => {
              callback(null, result); 
            })
            .catch((err) => {
              callback(err); 
            });
        },
        outfits: (callback) => {
          // let findJson = {
          //   role: USER_ROLES.USER,
          // };
          OutfitModel.countDocuments()
            .then((result) => {
              callback(null, result); 
            })
            .catch((err) => {
              callback(err); 
            });
        },
            posts: (callback) => {
          // let findJson = {
          //   role: USER_ROLES.USER,
          // };
          posts.countDocuments()
            .then((result) => {
              callback(null, result); 
            })
            .catch((err) => {
              callback(err); 
            });
        },
      },
      (err, result) => {
        if (!err) {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
        } else {
          return global.failResponse(res, err.message, err);
        }
      }
    );
  },

  listForRecentEventRegistration: async (req, res) => {
    try {
      let json = {};
      async.parallel(
        {
          list: (callback) => {
            EventRegistrationModel.aggregate([
              { $match: json },
              global.userDataQuery("createdBy", "createdBy"),
              global.userDataQuery("updatedBy", "updatedBy"),
              global.getEventsDataQuery(),
              global.userDataQuery(),
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              {
                $project: {
                  accommodation: 1,
                  add_guest: 1,
                  start_date: 1,
                  end_date: 1,
                  check_in: 1,
                  check_out: 1,
                  room_type: 1,
                  hotel: 1,
                  company_name: 1,
                  address: 1,
                  postal_code: 1,
                  city: 1,
                  country: 1,
                  visa_invitation: 1,
                  createdAt: 1,
                  createdBy: {
                    $arrayElemAt: ["$createdBy", 0],
                  },
                  updatedBy: {
                    $arrayElemAt: ["$updatedBy", 0],
                  },
                  status: 1,
                  event_data: {
                    $arrayElemAt: ["$event_data", 0],
                  },
                  user_data: {
                    $arrayElemAt: ["$user_data", 0],
                  },
                },
              },
            ])
              .exec()
              .then(function (result) {
                callback(null, result);
              })
              .catch((err) => {
                callback(null, err);
              });
          },
          total_records: (callback) => {
            EventRegistrationModel.count(json)
              .then(function (result) {
                callback(null, result);
              })
              .catch((err) => {
                callback(null, err);
              });
          },
          data_ids: (callback) => {
            EventRegistrationModel.aggregate([{ $match: json }, { $project: { _id: 1 } }])
              .exec()
              .then(function (result) {
                callback(
                  null,
                  result.map((item) => item._id)
                );
              })
              .catch((err) => {
                callback(null, err);
              });
          },
        },
        (err, result) => {
          if (!err) {
            return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
          } else {
            return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
          }
        }
      );
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },

  listForRecentUserRegistration: async (req, res) => {
    try {
      let json = {};
      async.parallel(
        {
          list: (callback) => {
            UserModel.aggregate([
              { $match: json },
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: "sharemedias",
                  let: { userId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$user_id", "$$userId"],
                            },
                          ],
                        },
                      },
                    },
                    {
                      $project: {
                        file_path: 1,
                      },
                    },
                  ],
                  as: "media",
                },
              },
              {
                $project: {
                  phone_number: 1,
                  phone_number_work: 1,
                  createdAt: 1,
                  status: 1,
                  first_name: 1,
                  middle_name: 1,
                  subscribed_for_newsletter: 1,
                  profile_image: global.userImageQuery(),
                  createdAt: 1,
                  email: 1,
                  name: 1,
                  last_name: 1,
                  gender: 1,
                  media: {
                    $map: {
                      input: "$media",
                      as: "grade",
                      in: "$$grade.file_path",
                    },
                  },
                },
              },
            ])
              .exec()
              .then(function (result) {
                callback(null, result);
              })
              .catch((err) => {
                callback(null, err);
              });
          },
          total_records: (callback) => {
            UserModel.countDocuments(json)
              .then(function (result) {
                callback(null, result);
              })
              .catch((err) => {
                callback(null, err);
              });
          },
          data_ids: (callback) => {
            UserModel.aggregate([{ $match: json }, { $project: { _id: 1 } }])
              .exec()
              .then(function (result) {
                callback(
                  null,
                  result.map((item) => item._id)
                );
              })
              .catch((err) => {
                callback(null, err);
              });
          },
        },
        (err, result) => {
          if (!err) {
            return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
          } else {
            return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
          }
        }
      );
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },

  usersOverview: async (req, res) => {
    const timeFilter = global.getTimeFilter(req);
    let json = {
      ...timeFilter.json,
    };
    UserModel.aggregate([
      { $match: json },
      { $sort: DEFAULT_SORTING },
      {
        $project: {
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: timeFilter.groupBy,
              date: "$createdAt",
            },
          },
          data: { $push: "$$ROOT.createdAt" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
      .exec()
      .then(function (result) {
        let data = global.manageGraphData(req, result);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, data);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  registrationsOverview: async (req, res) => {
    const timeFilter = global.getTimeFilter(req);
    let json = {
      ...timeFilter.json,
    };
    EventRegistrationModel.aggregate([
      { $match: json },
      { $sort: DEFAULT_SORTING },
      {
        $project: {
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: timeFilter.groupBy,
              date: "$createdAt",
            },
          },
          data: { $push: "$$ROOT.createdAt" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
      .exec()
      .then(function (result) {
        let data = global.manageGraphData(req, result);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, data);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  /**
   * GET /dashboard/revenue-overview
   * Monthly-wise revenue from IapTransaction (paid_amount sum grouped by time)
   */
  revenueOverview: async (req, res) => {
    try {
      const timeFilter = global.getTimeFilter(req, "createdAt");

      if (timeFilter.chartMode === "total") {
        const result = await IapTransaction.aggregate([
          { $match: { ...timeFilter.json } },
          { $group: { _id: null, total: { $sum: "$paid_amount" } } },
        ]).exec();
        const total = result[0]?.total ? parseFloat(result[0].total.toFixed(2)) : 0;
        const { labels, values } = global.buildTotalOverviewData(req, timeFilter, total);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, { labels, amounts: values });
      }

      IapTransaction.aggregate([
        { $match: { ...timeFilter.json } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: timeFilter.groupBy,
                date: "$createdAt",
              },
            },
            total: { $sum: "$paid_amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
        .exec()
        .then((result) => {
          const dataMap = Object.fromEntries(
            result.map((item) => [item._id, parseFloat(item.total.toFixed(2))])
          );
          const { labels, values } = global.buildFilledOverviewData(req, timeFilter, dataMap);
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, { labels, amounts: values });
        })
        .catch((err) => global.failResponse(res, err.message, err));
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },

  /**
   * GET /dashboard/items-outfits-overview
   * Items and Outfits counts grouped by time period
   */
  itemsOutfitsOverview: async (req, res) => {
    try {
      const timeFilter = global.getTimeFilter(req, "createdAt");
      const timeLimit = req.query.time_limit || "last_5_months";

      if (timeFilter.chartMode === "total") {
        const [itemsCount, outfitsCount] = await Promise.all([
          ItemsModel.countDocuments(timeFilter.json),
          OutfitModel.countDocuments(timeFilter.json),
        ]);
        const { labels } = global.buildTotalOverviewData(req, timeFilter, 0);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
          labels,
          items: [itemsCount || 0],
          outfits: [outfitsCount || 0],
        });
      }

      const groupStage = (dateField) => [
        { $match: { ...timeFilter.json } },
        { $sort: { [dateField]: 1 } },
        {
          $group: {
            _id: {
              $dateToString: { format: timeFilter.groupBy, date: `$${dateField}` },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];

      const [itemsResult, outfitsResult] = await Promise.all([
        ItemsModel.aggregate(groupStage("createdAt")).exec(),
        OutfitModel.aggregate(groupStage("createdAt")).exec(),
      ]);

      const itemsMap = Object.fromEntries(itemsResult.map((r) => [r._id, r.count]));
      const outfitsMap = Object.fromEntries(outfitsResult.map((r) => [r._id, r.count]));

      if (!timeFilter.startDate || !timeFilter.endDate) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, { labels: [], items: [], outfits: [] });
      }

      const periodKeys = global.getPeriodKeys(
        timeFilter.startDate,
        timeFilter.endDate,
        timeFilter.groupBy
      );
      const labels = periodKeys.map((key) =>
        global.formatOverviewLabel(key, timeLimit, timeFilter.groupBy)
      );
      const items = periodKeys.map((key) => itemsMap[key] || 0);
      const outfits = periodKeys.map((key) => outfitsMap[key] || 0);

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, { labels, items, outfits });
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },
};

export default dashboardController;
