import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE, UPLOADED_CATEGORIES_URL } from "../../../../../global-variable.js";

// models

import Category from "../../../../../models/category.js";

const UserCategoryController = {
  list: async (req, res) => {
    const type = req.query.type;
    let matchObj = {
      status: 1,
    };

    if (type) {
      matchObj.type = type;
    }

    async.parallel(
      {
        list: (callback) => {
          Category.aggregate([
            {
              $lookup: {
                from: "subcategories",
                localField: "_id",
                foreignField: "categoryId",
                as: "subCategories",
              },
            },
            {
              $match: { ...matchObj },
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
                  sizes: 1,
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
      },
      (err, result) => {
        if (err) {
          return global.failResponse(res, err.message, err);
        }
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      },
    );
  },
  outfitList: async (req, res) => {
    async.parallel(
      {
        list: (callback) => {
          Category.aggregate([
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
                status: 1,
                subCategories: {
                  _id: 1,
                  title: 1,
                  description: 1,
                  createdAt: 1,
                },
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
      },
      (err, result) => {
        if (err) {
          return global.failResponse(res, err.message, err);
        }
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      },
    );
  },
};

export default UserCategoryController;
