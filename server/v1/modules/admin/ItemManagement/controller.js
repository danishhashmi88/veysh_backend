import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";

// models
import Modal from "../../../../../models/items.js";

/** Admin panel prepends BASE_URL, so return relative upload paths only. */
function mapAdminItemImages(images = []) {
  if (!Array.isArray(images)) return [];
  return images.filter(Boolean).map((img) => {
    if (typeof img !== "string") return img;
    if (img.startsWith("http://") || img.startsWith("https://")) {
      try {
        return new URL(img).pathname.replace(/^\/+/, "");
      } catch {
        return img;
      }
    }
    const clean = img.replace(/^\/+/, "");
    if (clean.startsWith("uploads/")) return clean;
    return `uploads/items/${clean}`;
  });
}

const ItemController = {
  /**This function is used to get details */

  details: (req, res) => {
    const { o_id } = req.query;

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid item id", {});
    }

    Modal
      .aggregate([
        { $match: { _id: new ObjectId(o_id) } },

        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },

        {
          $lookup: {
            from: "subcategories",
            localField: "sub_category",
            foreignField: "_id",
            as: "sub_category",
          },
        },

        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),

        {
          $project: {
            name: 1,
            brand_name: 1,
            price: 1,
            purchased_on: 1,
            occasion: 1,
            mood: 1,
            season: 1,
            status: 1,
            statuses:1,
            care: 1,
            size: 1,
            match_with_my_size: 1,
            measurements: 1,
            colors: 1,
            fabric: 1,
            notes: 1,
            tags: 1,
            images: 1,

            category: { $arrayElemAt: ["$category", 0] },
            sub_category: { $arrayElemAt: ["$sub_category", 0] },

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
        if (item.images) {
          item.images = mapAdminItemImages(item.images);
        }
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, item);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  /**This function is used to edit template */
  //   edit: (req, res) => {
  //     const { o_id, title, description } = req.body;
  //     const recordId = new ObjectId(o_id);
  //     const { _id } = req.user;
  //     const updateData = {
  //       title: global.capitalizeFirstLetter(title),
  //       description,
  //     };
  //     /** Saving data */
  //     Modal.updateOne(
  //       {
  //         _id: recordId,
  //       },
  //       { $set: updateData }
  //     )
  //       .then((result) => {
  //         return global.successResponse(res, global.msg(req, res, "faq_updated"), result);
  //       })
  //       .catch((err) => {
  //         return global.failResponse(res, err.message, err);
  //       });
  //   },

  /**This function is used to get list of faq */
  list: async (req, res) => {
    const globalSearch = ["name", "brand_name"];
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
          Modal.aggregate([
            { $match: json },
            { $sort: sorting },
            { $skip: skip },
            { $limit: perPage },

            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $lookup: {
                from: "subcategories",
                localField: "sub_category",
                foreignField: "_id",
                as: "sub_category",
              },
            },

            {
              $project: {
                name: 1,
                brand_name: 1,
                price: 1,
                purchased_on: 1,
                occasion: 1,
                mood: 1,
                season: 1,
                status: 1,
                statuses: 1,
                care: 1,
                size: 1,
                match_with_my_size: 1,
                measurements: 1,
                colors: 1,
                fabric: 1,
                notes: 1,
                tags: 1,
                images: 1,
                createdAt: 1,

                category: { $arrayElemAt: ["$category", 0] },
                sub_category: { $arrayElemAt: ["$sub_category", 0] },
              },
            },
          ])
            .exec()
            .then((result) => {
              const list = (result || []).map((item) => ({
                ...item,
                images: mapAdminItemImages(item.images),
              }));
              callback(null, list);
            })
            .catch((err) => callback(err));
        },

        total_records: (callback) => {
          Modal.countDocuments(json)
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
    Modal.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"), result);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },

  delete: (req, res) => {
    let { o_id } = req.query;
    o_id = o_id?.trim();

    let ids = [new ObjectId(o_id)];
    let findJson = { _id: { $in: ids } };
    Modal.deleteMany(findJson)
      .then((deleted) => {
        return global.successResponse(res, global.msg(req, res, "item_deleted"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },
};

export default ItemController;
