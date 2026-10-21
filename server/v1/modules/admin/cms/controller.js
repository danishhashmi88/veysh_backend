import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import slugify from "slugify";
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";

/** Models */
import Modal from "../../../../../models/cms.js";


const cmsController = {
  save: (req, res) => {
    const { title, slug, status, menu_location, short_description, description, type } = req.body;
    const createdBy = req.user._id;
    const slugData = slugify(slug);
    const record = new Modal({
      title: global.capitalizeFirstLetter(title),
      slug: slugData.toLowerCase(),
      status,
      menu_location,
      short_description,
      description,
      type,
      createdBy,
    });
    record
      .save()
      .then(() => {
        return global.successResponse(res, global.msgByReq(req, "page_added"));
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  /**This function is used to get details */
  details: (req, res) => {
    const { o_id } = req.query;
    const json = { _id: new ObjectId(o_id) };
    Modal.aggregate([
      { $match: json },
      global.userDataQuery("createdBy", "createdBy"),
      global.userDataQuery("updatedBy", "updatedBy"),
      {
        $project: {
          slug: 1,
          title: 1,
          status: 1,
          menu_location: 1,
          short_description: 1,
          short_description_ja: 1,
          updatedAt: 1,
          createdAt: 1,
          description: 1,
          description_ja: 1,
          title_ja: 1,
          type: 1,
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
        },
      },
    ])
      .exec()
      .then(function (result) {
        if (result.length > 0) {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result[0]);
        } else {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  /**This function is used to edit template */
  edit: (req, res) => {
    const { o_id, title, title_ja, description_ja, slug, status, menu_location, short_description, short_description_ja, description, type } = req.body;
    const recordId = new ObjectId(o_id);
    const { _id } = req.user;
    const updateData = {
      title: global.capitalizeFirstLetter(title),
      slug: slug.toLowerCase(),
      description_ja,
      slug,
      status,
      title_ja,
      menu_location,
      short_description,
      short_description_ja,
      description,
      type,
      updatedBy: _id,
    };
    /** Saving data */
    Modal.updateOne(
      {
        _id: recordId,
      },
      { $set: updateData }
    )
      .then((result) => {
        return global.successResponse(res, global.msgByReq(req, "data_updated"), result);
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },


  /**This function is used to get list of email-templates */
  // assuming this is in an `async` function (e.g. as your controller handler)
  list: async (req, res) => {
    try {
       if (typeof req.body.search === "string") {
         req.body.search = JSON.parse(req.body.search);
       }
      const globalSearch = ["title", "title_de", "slug", "name", "name_de"];
      const page = Number(req.body.page) || 1;
      const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * (page - 1);

      const json = {
        ...global.getSearching(req, globalSearch),
        ...global.getFilter(req),
      };

      const sorting = await global.getSorting(req);

      // Prepare three parallel queries
      const aggregateQuery = Modal.aggregate([
        { $match: json },
        { $sort: sorting },
        { $skip: skip },
        { $limit: perPage },
        global.userDataQuery("updatedBy", "updatedBy"),
        global.userDataQuery("createdBy", "createdBy"),
        {
          $project: {
            slug: 1,
            title: 1,
            title_ja: 1,
            status: 1,
            menu_location: 1,
            short_description: 1,
            short_description_ja: 1,
            updatedAt: 1,
            createdAt: 1,
            description: 1,
            description_ja: 1,
            type: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
      ]).exec(); // return a Promise :contentReference[oaicite:0]{index=0}

      const countPromise = Modal.countDocuments(json).exec ? Modal.countDocuments(json).exec() : Modal.countDocuments(json);
      // countDocuments returns a thenable / promise-like too :contentReference[oaicite:1]{index=1}

      const idsPromise = Modal.aggregate([{ $match: json }, { $project: { _id: 1 } }]).exec(); // return a Promise :contentReference[oaicite:2]{index=2}

      // Execute all in parallel
      const [list, total_records, idDocs] = await Promise.all([aggregateQuery, countPromise, idsPromise]);

      const data_ids = idDocs.map((item) => item._id);

      const result = {
        list,
        total_records,
        data_ids,
        page,
        offset: skip,
        per_page: perPage,
      };

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
    } catch (err) {
      return global.failResponse(res, err.message || "Error", err);
    }
  },

  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msgByReq(req, "msg_status_changed_successfully"));
      })
      .catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },

  delete: (req, res) => {
    const { o_id } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.deleteMany(findJson)
      .then((deleted) => {
        return global.successResponse(res, global.msgByReq(req, "page_deleted"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },
};

export default cmsController;