import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import ReportedPosts from "../../../../../models/reported-posts.js";
const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE } from "../../../../../global-variable.js";

const ReportedPostsValidator = {
  /**This function is used to validate details get api */
  details: async (req, res, next) => {
    await global.validateObjId(req, "o_id", {
      findInDb: true,
      DBField: "_id",
      DB: ReportedPosts,
      query: true,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  delete: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: ReportedPosts, query: true },
      {
        required: "admin_err_o_id_is_required",
      },
    );

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default ReportedPostsValidator;
