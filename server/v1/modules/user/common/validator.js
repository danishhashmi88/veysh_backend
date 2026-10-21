import { validationResult } from "express-validator";
import { MESSAGE } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";

const CommonValidator = {
  contactQuery: async (req, res, next) => {
    await global.validateTextField(
      req,
      "email",
      { isEmail: true },
      { required: "admin_err_email_is_required", email: "admin_err_email_invalid" },
      "detail",
      {},
      { required: "admin_err_detail_is_required" }
    );
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  rentDetails: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { query: true },
      { required: "admin_err_o_id_is_required" }
    );
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },
};

export default CommonValidator;
