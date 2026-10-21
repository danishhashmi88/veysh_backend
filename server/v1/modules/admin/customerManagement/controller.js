import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";

// models
import Modal from "../../../../../models/users.js";
import userSubscription from "../../../../../models/user-subscription.js";

const CustomerController = {
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
          id: 1,
          full_name: 1,
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          username: 1,
          countryCode: 1,
          phone_number: 1,
          DOB: 1,
          gender: 1,
          role: 1,
          email: 1,
          address: 1,
          bio: 1,
          followers: 1,
          following: 1,
          google_id: 1,
          apple_id: 1,
          accountProvider: 1,
          is_email_verified: 1,
          terms_accepted: 1,
          privacy_accepted: 1,
          referral_link: 1,
          stylist_referral_link: 1,
          preferred_colors: 1,
          goals: 1,
          brands: 1,
          sizes: 1,
          measurement: 1,
          dislikes: 1,
          body_type: 1,
          hair_color: 1,
          hair_type: 1,
          eye_color: 1,
          face_shape: 1,
          complexion: 1,
          style_desc: 1,
          style: 1,
          mood_board: 1,
          sustain_preferences: 1,
          pinterest_link: 1,
          assign_task: 1,
          closetPrivacy: 1,
          full_body_image: 1,
          profile_image: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])
      .exec()
      .then(function (result) {
        if (result.length > 0) {
          let record = result[0];
          // build image urls
          record.profile_image = global.buildUserImageUrl(record.profile_image);
          if (record.full_body_image && record.full_body_image.length > 0) {
            record.full_body_image = record.full_body_image.map((img) => global.buildUserImageUrl(img));
          }
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, record);
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
        role: "user",
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
                  first_name: 1,
                  middle_name: 1,
                  last_name: 1,
                  full_name: 1,
                  username: 1,
                  DOB: 1,
                  referral_link: 1,
                  gender: 1,
                  countryCode: 1,
                  phone_number: 1,
                  name: 1,
                  email: 1,
                  status: 1,
                  role: 1,
                  createdAt: 1,
                },
              },
            ])
              .then((result) => callback(null, result))
              .catch((err) => callback(err));
          },

          total_records: (callback) => {
            Modal.countDocuments(json)
              .then((count) => callback(null, count))
              .catch((err) => callback(err));
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

  changeStatus: (req, res) => {
    const { o_id, status } = req.body;
    let ids = JSON.parse(o_id);
    let findJson = { _id: { $in: ids } };
    Modal.updateMany(findJson, { $set: { status: status } })
      .then((result) => {
        return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"));
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
        return global.successResponse(res, global.msg(req, res, "customer_deleted"), {});
      })
      .catch((error) => {
        return global.failResponse(res, error.message, error);
      });
  },

checkSubscription: async (req, res) => {
  try {
    const { o_id } = req.body;

    if (!ObjectId.isValid(o_id)) {
      return global.failResponse(res, "Invalid user id", {});
    }
    const result = await userSubscription.aggregate([
      {
        $match: {
          user_id: new ObjectId(o_id),
          status: 1
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          price: 1,
          subscription_id: 1,
          user_id: 1,
          duration_type: 1,
          start_date: 1,
          end_date: 1,
          paid_amount: 1,
          credit_amount: 1,
          razorpay_order_id: 1,
          razorpay_payment_id: 1,
          status: 1,
          razorpay_subscription_id: 1,
          description: 1,
          createdBy: 1,
          updateBy: 1
        }
      }
    ]);

    console.log("result",result);
    

    return global.successResponse(
      res,
      MESSAGE.OPR_SUCCESS,
      result || {}
    );
  } catch (err) {
    return global.failResponse(res, err.message, err);
  }
}
}




export default CustomerController;
