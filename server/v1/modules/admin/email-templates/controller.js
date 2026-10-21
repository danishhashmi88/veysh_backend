import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import slugify from "slugify";
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE,EMAIL_TEMPLATE_TYPES } from "../../../../../global-variable.js";

/** Models */
import Modal from "../../../../../models/email-templates.js";



const emailTempController = {
  save: (req, res) => {
    const { title, slug, options, subject, description, type, short_description } = req.body;
    const user_id = req.user._id;
    let newSlug = req.body.type == EMAIL_TEMPLATE_TYPES.DEFAULT ? slug : slugify(title);
    /**Saving data to database */
    Modal.findOne({ slug: newSlug.toLowerCase() }).then((data) => {
      if (data) {
        return global.failResponse(res, "This template is already exists");
      } else {
        const record = new Modal({
          title: global.capitalizeFirstLetter(title),
          type: type,
          slug: newSlug.toLowerCase(),
          subject: subject,
          description: description,
          short_description: short_description,
          status: 1,
          user_id: user_id
        });
        try {
          record.options = JSON.parse(options);
        } catch (err) {
          console.log(err.message)
        }

        record.save().then(term => {
          return global.successResponse(res, 'Email template added successfully');
        }).catch(err => {
          return global.failResponse(res, err.message, err);
        });
      }
    }).catch(err => {
      return global.failResponse(res, err.message, err);
    });
  },

  details: (req, res) => {
    const { o_id } = req.query;
    const json = { _id: new ObjectId(o_id) };
    Modal.aggregate([
      { $match: json },
      global.userDataQuery(),
      {
        $project: {
          title: 1,
          subject: 1,
          options: 1,
          description: 1,
          options: 1,
          status: 1,
          short_description: 1,
          slug: 1,
          createdAt: 1,
          status: 1,
          updatedAt: 1,
          user_data: { $arrayElemAt: ["$user_data", 0] },
        }
      }
    ]).exec().then(function (result) {
      if (result.length > 0) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result[0]);
      } else {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
      }
    }).catch((err) => {
      return global.failResponse(res, err.message, err);
    })
  },

  edit: (req, res) => {
    const { o_id, title, slug, options, subject, description, short_description } = req.body;
    const { _id } = req.user;
    const recordId = new ObjectId(o_id);
    const updateData = {
      title: global.capitalizeFirstLetter(title),
      subject: subject,
      description: description,
      short_description: short_description,
      updatedAt: new Date(),
      updatedBy: _id
    }
    try {
      updateData.options = JSON.parse(options);
    } catch (err) {
      console.log(err.message);
    }
    /** Saving data */
    Modal.updateOne(
      {
        _id: recordId
      },
      { $set: updateData })
      .then((result) => {
        return global.successResponse(res, 'Email template updated successfully', result);
      }).catch((err) => {
        return global.failResponse(res, err.message, err);
      })
  },

  /**This function is used to get list of email-templates */
  list: async (req, res) => {
     if (typeof req.body.search === "string") {
       req.body.search = JSON.parse(req.body.search);
     }
    const globalSearch = ['title', 'subject', 'slug'];
    const page = Number(req.body.page) || 1;
    let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = (perPage * page) - perPage;
    let json = {
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req)
    };
    if (req.body.type) {
      json.type = req.body.type;
    }
    let sorting = await global.getSorting(req);
    async.parallel({
      list: (callback) => {
        Modal.aggregate([
          { $match: json },
          { $sort: sorting },
          { $skip: skip },
          { $limit: perPage },
          global.userDataQuery(),
          {
            $lookup: {
              from: 'users',
              let: { updatedBy: '$updatedBy' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$_id', '$$updatedBy'] }
                      ],
                    },
                  }
                },
                {
                  $project: {
                    email: 1,
                    name: 1,
                    profile_image: global.userImageQuery()
                  }
                },
              ],
              as: "updatedBy",
            }
          },
          {
            $project: {
              title: 1,
              subject: 1,
              options: 1,
              description: 1,
              options: 1,
              status: 1,
              slug: 1,
              short_description: 1,
              createdAt: 1,
              status: 1,
              user_data: { $arrayElemAt: ["$user_data", 0] },
              updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
            }
          }
        ]).exec().then(function (result) {
          callback(null, result);
        }).catch((err) => {
          callback(null, err);
        });
      },
      total_records: (callback) => {
        Modal.countDocuments(json).then(function (result) {
          callback(null, result);
        }).catch((err) => {
          callback(null, err);
        });
      },
      data_ids: (callback) => {
        Modal.aggregate([{ $match: json }, { $project: { _id: 1 } }]).exec().then(function (result) {
          callback(null, result.map(item => item._id));
        }).catch((err) => {
          callback(null, err);
        });
      },
      page: (callback) => {
        callback(null, page);
      },
      offset: (callback) => {
        callback(null, skip);
      },
      per_page: (callback) => {
        callback(null, perPage);
      },

    }, (err, result) => {
      if (!err) {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      } else {
        return global.failResponse(res, err.message, err);
      }
    });
  },

  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.updateMany(
      findJson,
      { $set: { status: status } }).then((result) => {
        return global.successResponse(res, MESSAGE.STATUS_CHANGE);
      }).catch((err) => {
        return global.failResponse(res, err.message, JSON.stringify(err));
      });
  },

  deleteRecord: (req, res) => {
    const { o_id } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.deleteMany(findJson).then((deleted) => {
      return global.successResponse(res, MESSAGE.DELETED, {});
    }).catch((error) => {
      return global.failResponse(res, error.message, error);
    });
  },

  options: async (req, res) => {
    const json = {
      status: ACTIVE
    };
    if (req.body.type) {
      json.type = req.body.type;
    }
    Modal.aggregate([
      { $match: json },
      { $sort: { title: SORT_A } },
      {
        $project: {
          title: 1,
          subject: 1,
          slug: 1
        }
      },
    ]).exec()
      .then(result => {
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
      })
      .catch(err => {
        return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
      });
  },

  sendTestEmail: (req, res) => {
    try {
      const { slug, email} = req.body;
      Modal.findOne({ slug })
        .then((emailTemplate) => {
          if (!emailTemplate) {
            return global.failResponse(res, "Email template not found");
          }
          let allLogs = [{
            name:email.split("@")[0],
            email: email,
            email_slug: slug,
            email_body: emailTemplate.description,
            email_subject: emailTemplate.subject,
            send_type: EMAIL_LOG_SEND_TYPES.REGULAR,
          }];
          EmailLogsModal.insertMany(allLogs)
            .then((insertedLogs) => {
              global.setEmailQueue(insertedLogs)
                .then(() => {
                  return global.successResponse(res, "Email sent successfully");
                })
                .catch((err) => {
                  return global.failResponse(res, err.message, err);
                });
            })
            .catch((err) => {
              return global.failResponse(res, err.message, err);
            });
        })
        .catch((err) => {
          return global.failResponse(res, err.message, err);
        });
    } catch (error) {
      return global.failResponse(res, error.message, error);
    }
  }
}

export default emailTempController;