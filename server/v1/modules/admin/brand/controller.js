import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;


import async from "async";
import {
  MESSAGE,
  UPLOAD_FILE_PATH,
  PER_PAGE_RECORDS,
} from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
// model
import Brand from "../../../../../models/brand.js";

const BrandController = {
  /** SAVE BRAND */
  save: async (req, res) => {
    try {
      const { title } = req.body;
      const createdBy = req.user._id;

      const formattedTitle = global.capitalizeFirstLetter(title.trim());

      const existingBrand = await Brand.findOne({
        title: formattedTitle,
      });

      if (existingBrand) {
        return global.failResponse(
          res,
          global.msg(req, res, "Brand name already exists"),
          {}
        );
      }

      const insertData = {
        title: formattedTitle,
        createdBy,
      };

      const imageName = await global.uploadFile(req, "image", "brands");

      if (imageName) {
        insertData.image = imageName;
      }

      const brand = new Brand(insertData);
      const result = await brand.save();

      return global.successResponse(
        res,
        global.msg(req, res, "Brand created successfully"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  /** BRAND DETAILS */
  details: async (req, res) => {
    try {
      const { o_id } = req.query;

      const result = await Brand.aggregate([
        { $match: { _id: new ObjectId(o_id) } },

        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),

        {
          $project: {
            title: 1,
            image: { $concat: [process.env.BASE_URL + "/uploads/brands/", "$image"] },
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ]);

      return global.successResponse(
        res,
        MESSAGE.OPR_SUCCESS,
        result[0] || {}
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  /** EDIT BRAND */
  edit: async (req, res) => {
    try {
      const { o_id, title } = req.body;

      const formattedTitle = global.capitalizeFirstLetter(title.trim());

      const existingBrand = await Brand.findOne({
        title: formattedTitle,
        _id: { $ne: new ObjectId(o_id) },
      });

      if (existingBrand) {
        return global.failResponse(
          res,
          global.msg(req, res, "Brand name already exists"),
          {}
        );
      }

      const updateData = {
        title: formattedTitle,
        updatedBy: req.user._id,
      };

      const imageName = await global.uploadFile(req, "image", "brands");

      if (imageName) {
        const brand = await Brand.findById(o_id);

        if (brand?.image) {
          const oldImagePath =
            UPLOAD_FILE_PATH + "brands/" + brand.image;

          await global.removeFiles(oldImagePath);
        }

        updateData.image = imageName;
      }

      const result = await Brand.updateOne(
        { _id: new ObjectId(o_id) },
        { $set: updateData }
      );

      return global.successResponse(
        res,
        global.msg(req, res, "Brand Updated Successfully"),
        result
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  /** BRAND LIST */
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
          Brand.aggregate([
            { $match: json },
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },

            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),

            {
              $project: {
                title: 1,
                image: { $concat: [process.env.BASE_URL + "/uploads/brands/", "$image"] },
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
          Brand.countDocuments(json)
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

        return global.successResponse(
          res,
          MESSAGE.OPR_SUCCESS,
          result
        );
      }
    );
  },

  /** CHANGE STATUS */
  changeStatus: async (req, res) => {
    try {
      const { o_id, status } = req.body;

      const ids = JSON.parse(o_id);

      await Brand.updateMany(
        { _id: { $in: ids } },
        { $set: { status } }
      );

      return global.successResponse(
        res,
        global.msg(req, res, "msg_status_changed_successfully")
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  /** DELETE BRAND */
  delete: async (req, res) => {
    try {
      const { o_id } = req.query;

      const brand = await Brand.findById(o_id);

      if (brand?.image) {
        const oldImagePath =
          UPLOAD_FILE_PATH + "brands/" + brand.image;

        await global.removeFiles(oldImagePath);
      }

      await Brand.deleteOne({
        _id: new ObjectId(o_id),
      });

      return global.successResponse(
        res,
        global.msg(req, res, "Brand Deleted Successfully"),
        {}
      );
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default BrandController;