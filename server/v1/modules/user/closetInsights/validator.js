const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/planner.js";

const DashboardValidator = {
  getWardrobeInsights: async (req, res, next) => {
    await global.validateTextField(req, "type", "type_is_required");

    const errors = validationResult(req).array({ onlyFirstError: true });

    // Validate type is one of the allowed values
    if (req.body.type && !["most_worn", "least_worn", "never_worn"].includes(req.body.type)) {
      errors.push({
        msg: global.msg(req, res, "invalid_type") || "Invalid type. Must be: most_worn, least_worn, or never_worn",
        param: "type",
        location: "body"
      });
    }

    if (errors.length === 0) {
      return next();
    }

    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  }
};

export default DashboardValidator;
