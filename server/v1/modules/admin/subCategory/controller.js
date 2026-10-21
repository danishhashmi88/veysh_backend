import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";

// models
import Modal from "../../../../../models/subCategory.js";
import CategoryModal from "../../../../../models/category.js"
const SubCategoryController = {
  save: async (req, res) => {
    try {
      const { title, description, categoryId } = req.body;

      if (!ObjectId.isValid(categoryId)) {
        return global.failResponse(res, "Invalid category id");
      }

      const formattedTitle = global.capitalizeFirstLetter(title.trim());


      let sizes = [];
      if (req.body.sizes) {
        try {
          const parsed = JSON.parse(req.body.sizes);
          sizes = Array.isArray(parsed)
            ? parsed
              .map((s) => ({
                title: String(s?.title || "").trim(),
              }))
              .filter((s) => s.title)
            : [];
        } catch (e) {
          return global.failResponse(res, "Invalid sizes payload", {});
        }
      }

      // if (!sizes.length) {
      //   return global.failResponse(res, "Size is required", {});
      // }


      /* 🔍 Check duplicate ONLY inside same category */
      const existingSubCategory = await Modal.findOne({
        title: formattedTitle,
        categoryId: new ObjectId(categoryId),
      });

      if (existingSubCategory) {
        return global.failResponse(
          res,
          global.msg(req, res, "sub_category_title_already_used"),
          {}
        );
      }

      const createdBy = req.user._id;

      const subCategory = new Modal({
        categoryId: new ObjectId(categoryId),
        title: formattedTitle,
        description,
        sizes,
        createdBy,
      });

      const result = await subCategory.save();

      return global.successResponse(
        res,
        global.msg(req, res, "subcategory_added"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },


  /**This function is used to get details */
  details: (req, res) => {
    const { o_id } = req.query;

    const json = { _id: new ObjectId(o_id) };

    Modal.aggregate([
      { $match: json },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      global.userDataQuery("createdBy", "createdBy"),
      global.userDataQuery("updatedBy", "updatedBy"),
      {
        $project: {
          title: 1,
          description: 1,
          sizes: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          category: { $arrayElemAt: ["$category", 0] },
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

  /**This function is used to edit template */
  edit: async (req, res) => {
    try {
      const { o_id, title, description, categoryId } = req.body;

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid subcategory id");
      }

      let sizes = [];
      if (req.body.sizes) {
        try {
          const parsed = JSON.parse(req.body.sizes);
          sizes = Array.isArray(parsed)
            ? parsed
              .map((s) => ({
                title: String(s?.title || "").trim(),
              }))
              .filter((s) => s.title)
            : [];
        } catch (e) {
          return global.failResponse(res, "Invalid sizes payload", {});
        }
      }

      // if (!sizes.length) {
      //   return global.failResponse(res, "Size is required", {});
      // }

      const updateData = {
        title: global.capitalizeFirstLetter(title),
        description,
        sizes,
      };

      if (categoryId && ObjectId.isValid(categoryId)) {
        updateData.categoryId = new ObjectId(categoryId);
      }


      const duplicate = await Modal.findOne({
        _id: { $ne: new ObjectId(o_id) },
        title: updateData.title,
        categoryId: updateData.categoryId,
      });

      if (duplicate) {
        return global.failResponse(
          res,
          "Subcategory title already exists in this category"
        );
      }

      const result = await Modal.updateOne(
        { _id: new ObjectId(o_id) },
        { $set: updateData }
      );

      return global.successResponse(
        res,
        global.msg(req, res, "subcategory_updated"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },


  /**This function is used to get list of faq */
  list: async (req, res) => {

    const globalSearch = ["title"];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    let json = {
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    const searchParams = typeof req.body.search === "string" ? JSON.parse(req.body.search) : req.body.search || {};

    // Remove type from json as it's not a field in SubCategory model
    // It will be handled later in the aggregate after lookup
    if (json.type) delete json.type;

    if (searchParams.categoryId && ObjectId.isValid(searchParams.categoryId)) {
      json.categoryId = new ObjectId(searchParams.categoryId);
    }

    let typeFilter = null;
    if (searchParams.type) {
      typeFilter = searchParams.type;
    }

    let sorting = await global.getSorting(req);

    async.parallel(
      {
        list: (callback) => {
          let pipeline = [
            { $match: json },
            {
              $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category",
              },
            },
            { $unwind: "$category" },
          ];

          if (typeFilter) {
            pipeline.push({ $match: { "category.type": typeFilter } });
          }

          pipeline.push(
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },
            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),
            {
              $project: {
                title: 1,
                description: 1,
                sizes: 1,
                status: 1,
                type: "$category.type",
                createdAt: 1,
                updatedAt: 1,
                category: 1,
                createdBy: { $arrayElemAt: ["$createdBy", 0] },
                updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
              },
            }
          );

          Modal.aggregate(pipeline)
            .exec()
            .then((result) => callback(null, result))
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          if (typeFilter) {
            Modal.aggregate([
              { $match: json },
              {
                $lookup: {
                  from: "categories",
                  localField: "categoryId",
                  foreignField: "_id",
                  as: "category",
                },
              },
              { $unwind: "$category" },
              { $match: { "category.type": typeFilter } },
              { $count: "total" },
            ])
              .exec()
              .then((result) => callback(null, result[0]?.total || 0))
              .catch((err) => callback(err));
          } else {
            Modal.countDocuments(json)
              .then((count) => callback(null, count))
              .catch((err) => callback(err));
          }
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
      }
    );
  },

  listByCategory: async (req, res) => {
    const page = Number(req.body.page) || 1;
    const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * page - perPage;

    let categoryId = req.body.categoryId;

    if (!categoryId || !ObjectId.isValid(categoryId)) {
      return global.failResponse(res, "Invalid or missing categoryId");
    }

    const preMatchJson = { categoryId: new ObjectId(categoryId), ...global.getFilter(req) };

    let sorting = await global.getSorting(req);

    async.parallel(
      {
        list: (callback) => {
          Modal.aggregate([
            { $match: preMatchJson },
            {
              $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $addFields: {
                category: { $arrayElemAt: ["$category", 0] },
              },
            },
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },
            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),
            {
              $project: {
                title: 1,
                description: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                category: 1,
                createdBy: { $arrayElemAt: ["$createdBy", 0] },
                updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
              },
            },
          ])
            .exec()
            .then((result) => callback(null, result))
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          Modal.aggregate([
            { $match: preMatchJson },
            { $count: "total" },
          ])
            .exec()
            .then((result) => callback(null, result[0]?.total || 0))
            .catch((err) => callback(err));
        },

        page: (callback) => callback(null, page),
        offset: (callback) => callback(null, skip),
        per_page: (callback) => callback(null, perPage),
      },
      (err, result) => {
        if (err) return global.failResponse(res, err.message, err);
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      }
    );
  },

  //created the categoryList api
  categoryList: async (req, res) => {
    try {
      if (typeof req.body.search === "string") {
        req.body.search = JSON.parse(req.body.search);
      }

      const globalSearch = ["title", "description"];
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;

      let json = {
        ...global.getSearching(req, globalSearch),
        ...global.getFilter(req),
      };

      let sorting = await global.getSorting(req);

      async.parallel(
        {
          list: (callback) => {
            CategoryModal.aggregate([
              { $match: json },
              { $sort: sorting },
              { $skip: skip },
              { $limit: perPage },
              global.userDataQuery("createdBy", "createdBy"),
              global.userDataQuery("updatedBy", "updatedBy"),
              {
                $project: {
                  title: 1,
                  description: 1,
                  type: 1,
                  status: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  createdBy: { $arrayElemAt: ["$createdBy", 0] },
                  updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
                },
              },
            ])
              .exec()
              .then((result) => callback(null, result))
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            CategoryModal.countDocuments(json)
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
        }
      );
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  },

  delete: (req, res) => {
    const { o_id } = req.query;
    let ids = [new ObjectId(o_id)];
    let findJson = { _id: { $in: ids } };
    Modal.deleteMany(findJson)
      .then((deleted) => {
        return global.successResponse(res, global.msg(req, res, "subcategory_deleted"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },

  /** CATEGORY status change) */
  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"), result);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },
};


export default SubCategoryController;