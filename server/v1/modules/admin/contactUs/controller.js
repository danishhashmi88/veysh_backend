import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js"
;

// models
import Modal from "../../../../../models/contact-us.js";

const ContactController = {
//   save: (req, res) => {
//     const { title, description } = req.body;
//     const createdBy = req.user._id;
//     const record = new Modal({
//       title: global.capitalizeFirstLetter(title),
//       description,
//     });
//     record
//       .save()
//       .then(() => {
//         return global.successResponse(res, global.msg(req, res, "faq_added"));
//       })
//       .catch((err) => {
//         return global.failResponse(res, err.message, err);
//       });
//   },

  /**This function is used to get details */
  details: (req, res) => {
  const { o_id } = req.query;
  const json = { _id: new ObjectId(o_id) };
    Modal.aggregate([
      { $match: json },
      {
        $project: {
          name: 1,
          email: 1,
          subject: 1,
          message: 1,
          type: 1,
          phone: 1,
          createdAt: 1,
          updatedAt: 1,
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
  try {
    const globalSearch = ["email"];
    const body = req.body || {};

    const page = Number(body.page) || 1;
    const perPage = Number(body.per_page) || PER_PAGE_RECORDS;
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
              $project: {
                name: 1,
                email: 1,
                subject: 1,
                message: 1,
                type: 1,
                createdAt: 1,
              },
            },
          ])
            .then(result => callback(null, result))
            .catch(err => callback(err));
        },

        total_records: (callback) => {
          Modal.countDocuments(json)
            .then(count => callback(null, count))
            .catch(err => callback(err));
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

//   changeStatus: (req, res) => {
//     const { o_id, status } = req.body;
//     let ids = JSON.parse(o_id);
//     let findJson = { _id: { $in: ids } };
//     Modal.updateMany(findJson, { $set: { status: status } })
//       .then((result) => {
//         return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"));
//       })
//       .catch((err) => {
//         return global.failResponse(res, err.message, JSON.stringify(err));
//       });
//   },

  delete: (req, res) => {
    let { o_id } = req.query;
    o_id = o_id?.trim();
  
  
   
    let ids = [new ObjectId(o_id)];
    let findJson = { _id: { $in: ids } };
    Modal.deleteMany(findJson)
      .then((deleted) => {
        return global.successResponse(res, global.msg(req, res, "contact_us_deleted"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },
};

export default ContactController;
