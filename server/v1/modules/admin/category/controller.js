import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE, UPLOAD_FILE_PATH, UPLOADED_CATEGORIES_URL } from "../../../../../global-variable.js";

// models
import Category from "../../../../../models/category.js";
import SubCategory from "../../../../../models/subCategory.js";

const CategoryController = {
  save: async (req, res) => {
    try {
      const { title, description, type } = req.body;
      const createdBy = req.user._id;
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

      if (!sizes.length) {
        return global.failResponse(res, "Size is required", {});
      }

      // Check if category already exists with same title and type
      const existingCategory = await Category.findOne({ title: formattedTitle, type });
      if (existingCategory) {
        return global.failResponse(
          res,
          global.msg(req, res, "category_title_already_used"),
          {}
        );
      }

      // Prepare the data to insert
      const insertData = {
        title: formattedTitle,
        description,
        type,
        sizes,
        createdBy,
      };

      // Upload image if present
      global.uploadFile(req, 'image', 'categories')
        .then((imageName) => {
          if (imageName) {
            insertData.image = imageName;
          }

          // Save the new category with optional image
          const category = new Category(insertData);
          category.save()
            .then((result) => {
              return global.successResponse(
                res,
                global.msg(req, res, "category_added"),
                result
              );
            })
            .catch((err) => {
              return global.failResponse(res, err.message, err);
            });
        })
        .catch((err) => {
          return global.failResponse(res, err.message, err);
        });

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  /** CATEGORY DETAILS (WITH SUBCATEGORIES) */
  details: (req, res) => {
    const { o_id } = req.query;

    Category.aggregate([
      { $match: { _id: new ObjectId(o_id) } },

      {
        $lookup: {
          from: "subcategories",
          localField: "_id",
          foreignField: "categoryId",
          as: "subCategories",
        },
      },

      global.userDataQuery("createdBy", "createdBy"),
      global.userDataQuery("updatedBy", "updatedBy"),

      {
        $project: {
          title: 1,
          description: 1,
          type: 1,
          sizes: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          subCategories: {
            _id: 1,
            title: 1,
            description: 1,
            createdAt: 1,
          },
          image: { $concat: [UPLOADED_CATEGORIES_URL, '$image'] },
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

  /** EDIT CATEGORY */
  edit: async (req, res) => {
    try {
      const { o_id, title, description, type } = req.body;

      if (!ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid category ID", {});
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

      if (!sizes.length) {
        return global.failResponse(res, "Size is required", {});
      }

      const existingCategory = await Category.findOne({
        title: formattedTitle,
        type,
        _id: { $ne: new ObjectId(o_id) },
      });

      if (existingCategory) {
        return global.failResponse(
          res,
          global.msg(req, res, "category_title_already_used"),
          {}
        );
      }

      const updateData = {
        title: formattedTitle,
        description,
        type,
        sizes
      };

      // ----- Image upload logic -----
      const imageName = await global.uploadFile(req, 'image', 'categories');
      if (imageName) {
        // Remove old image if exists
        const category = await Category.findById(o_id);
        if (category?.image) {
          const oldImagePath = UPLOAD_FILE_PATH + "categories/" + category.image;
          await global.removeFiles(oldImagePath);
        }
        updateData.image = imageName;
      }
      // ------------------------------

      const result = await Category.updateOne(
        { _id: new ObjectId(o_id) },
        { $set: updateData }
      );

      return global.successResponse(
        res,
        global.msg(req, res, "category_updated"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },


  /** CATEGORY LIST (WITH SUBCATEGORY COUNT) */
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
    if (searchParams.type) {
      json.type = searchParams.type;
    }

    let sorting = await global.getSorting(req);

    async.parallel(
      {
        list: (callback) => {
          Category.aggregate([
            { $match: json },
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },

            {
              $lookup: {
                from: "subcategories",
                localField: "_id",
                foreignField: "categoryId",
                as: "subCategories",
              },
            },

            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),

            {
              $project: {
                title: 1,
                description: 1,
                type: 1,
                sizes: 1,
                status: 1,
                subCategories: {
                  _id: 1,
                  title: 1,
                  description: 1,
                  createdAt: 1,
                },
                image: { $concat: [UPLOADED_CATEGORIES_URL, '$image'] },
                createdAt: 1,
                updatedAt: 1,
                subCategoryCount: { $size: "$subCategories" },
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
          Category.countDocuments(json)
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
  },
  /** CATEGORY status change) */
  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Category.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"));
      })
      .catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },

  /** DELETE CATEGORY (WITH CASCADE DELETE SUBCATEGORIES) */
  delete: async (req, res) => {
    const { o_id } = req.query;
    const categoryId = new ObjectId(o_id);

    try {
      await Category.deleteOne({ _id: categoryId });
      await SubCategory.deleteMany({ categoryId });

      return global.successResponse(res, global.msg(req, res, "category_deleted"), {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default CategoryController;
