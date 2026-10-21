import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE, PER_PAGE_RECORDS } from "../../../../../global-variable.js";

// models
import ReportedPosts from "../../../../../models/reported-posts.js";
import Posts from "../../../../../models/posts.js";

const ReportedPostsController = {
  /**This function is used to get details of a reported post */
  details: (req, res) => {
    const { o_id } = req.query;

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid report id", {});
    }

    ReportedPosts.aggregate([
      { $match: { _id: new ObjectId(o_id) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                first_name: 1,
                last_name: 1,
                full_name: 1,
                username: 1,
                email: 1,
                profile_image: 1,
              },
            },
          ],
          as: "reportedBy",
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "post_id",
          foreignField: "_id",
          pipeline: [
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
                      username: 1,
                      profile_image: 1,
                    },
                  },
                ],
                as: "createdBy",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                caption: 1,
                images: 1,
                videos: 1,
                tags: 1,
                location: 1,
                likes: 1,
                comments: 1,
                createdAt: 1,
                createdBy: { $arrayElemAt: ["$createdBy", 0] },
              },
            },
          ],
          as: "post",
        },
      },
      {
        $project: {
          _id: 1,
          reason: 1,
          createdAt: 1,
          updatedAt: 1,
          reportedBy: { $arrayElemAt: ["$reportedBy", 0] },
          post: { $arrayElemAt: ["$post", 0] },
        },
      },
    ])
      .exec()
      .then((result) => {
        const report = result[0] || {};
        
        // Format the response
        if (report.post) {
          report.post.images = global.buildUploadUrls(report.post.images || []);
          report.post.videos = global.buildUploadUrls(report.post.videos || []);
          report.post.likesCount = (report.post.likes || []).length;
          report.post.commentsCount = (report.post.comments || []).length;
          if (report.post.createdBy) {
            report.post.createdBy.profile_image = global.buildUserImageUrl(report.post.createdBy.profile_image);
          }
        }
        
        if (report.reportedBy) {
          report.reportedBy.profile_image = global.buildUserImageUrl(report.reportedBy.profile_image);
        }

        return global.successResponse(res, MESSAGE.OPR_SUCCESS, report);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  /**This function is used to get list of reported posts */
  list: async (req, res) => {
    const globalSearch = [
      "reason",
      "reportedBy.name",
      "reportedBy.full_name",
      "reportedBy.first_name",
      "reportedBy.last_name",
      "reportedBy.email",
      "post.caption",
    ];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    let json = {
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    let sorting = await global.getSorting(req);
    if (!sorting || Object.keys(sorting).length === 0) {
      sorting = { createdAt: -1 }; // Default sort by newest first
    }

    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                first_name: 1,
                last_name: 1,
                full_name: 1,
                username: 1,
                email: 1,
                profile_image: 1,
              },
            },
          ],
          as: "reportedBy",
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "post_id",
          foreignField: "_id",
          pipeline: [
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
                      username: 1,
                      profile_image: 1,
                    },
                  },
                ],
                as: "createdBy",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                caption: 1,
                images: 1,
                videos: 1,
                tags: 1,
                location: 1,
                likes: 1,
                comments: 1,
                createdAt: 1,
                createdBy: { $arrayElemAt: ["$createdBy", 0] },
              },
            },
          ],
          as: "post",
        },
      },
      {
        $project: {
          _id: 1,
          user_id: 1,
          post_id: 1,
          reason: 1,
          createdAt: 1,
          updatedAt: 1,
          reportedBy: { $arrayElemAt: ["$reportedBy", 0] },
          post: { $arrayElemAt: ["$post", 0] },
        },
      },
      { $match: json },
    ];

    async.parallel(
      {
        list: (callback) => {
          ReportedPosts.aggregate([
            ...pipeline,
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },
          ])
            .exec()
            .then((result) => {
              // Format the response
              const formattedResult = result.map((report) => {
                if (report.post) {
                  report.post.images = global.buildUploadUrls(report.post.images || []);
                  report.post.videos = global.buildUploadUrls(report.post.videos || []);
                  report.post.likesCount = (report.post.likes || []).length;
                  report.post.commentsCount = (report.post.comments || []).length;
                  if (report.post.createdBy) {
                    report.post.createdBy.profile_image = global.buildUserImageUrl(report.post.createdBy.profile_image);
                  }
                }
                
                if (report.reportedBy) {
                  report.reportedBy.profile_image = global.buildUserImageUrl(report.reportedBy.profile_image);
                }
                
                return report;
              });
              
              callback(null, formattedResult);
            })
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          ReportedPosts.aggregate([...pipeline, { $count: "count" }])
            .then((result) => callback(null, result.length > 0 ? result[0].count : 0))
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

  delete: (req, res) => {
    let { o_id } = req.query;
    o_id = o_id?.trim();

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid report id", {});
    }

    let ids = [new ObjectId(o_id)];
    let findJson = { _id: { $in: ids } };
    ReportedPosts.deleteMany(findJson)
      .then((deleted) => {
        return global.successResponse(res, global.msg(req, res, "Reported Post deleted successfully"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },
};

export default ReportedPostsController;
